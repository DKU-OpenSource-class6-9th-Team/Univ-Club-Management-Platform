import shutil
import tempfile
from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import Profile
from club_members.models import ClubMembership as ManagedClubMembership
from clubs.models import (
    BiweeklySurvey,
    BiweeklySurveyResponse,
    Club,
    SurveyItem,
    SurveyState,
    SurveySubmission,
)
from clubs.services.health_analysis import (
    build_health_analysis_payload,
    build_member_metrics,
    build_schedule_operation_metrics,
    build_satisfaction_metrics,
)
from events.models import Attendance, Event, EventApplication
from fees.models import FeeReceipt, FeeTransaction, MemberFeePayment


class HealthAnalysisImpactIndicatorTests(TestCase):
    @classmethod
    def setUpClass(cls):
        cls._media_root = tempfile.mkdtemp()
        cls._override_media_root = override_settings(MEDIA_ROOT=cls._media_root)
        cls._override_media_root.enable()
        super().setUpClass()

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        cls._override_media_root.disable()
        shutil.rmtree(cls._media_root, ignore_errors=True)

    def setUp(self):
        self.User = get_user_model()
        self.manager = self.create_user("manager")
        self.club = Club.objects.create(
            name="Health Test Club",
            category="IT",
            club_type="central",
            description="Test club",
            created_by=self.manager,
        )

        self.members = [
            self.create_user(f"member{i}")
            for i in range(1, 6)
        ]

        member_rows = [
            ("new", 100),
            ("regular", 80),
            ("regular", 60),
            ("inactive", 40),
            ("withdrawn", 20),
        ]

        for user, (status, activity_score) in zip(self.members, member_rows):
            ManagedClubMembership.objects.create(
                user=user,
                club=self.club,
                status=status,
                activity_score=activity_score,
            )

        self.create_schedule_data()
        self.create_finance_data()
        self.create_survey_data()

    def create_user(self, username):
        user = self.User.objects.create_user(
            username=username,
            password="password",
            email=f"{username}@example.com",
        )
        Profile.objects.create(
            user=user,
            school_name="Test University",
            department="Computer Science",
            student_id=f"2026{user.id:04d}",
            nickname=username,
        )
        return user

    def create_event(self, title, status):
        now = timezone.now()
        cancel_reason = "cancelled for test" if status == Event.STATUS_CANCELED else ""

        return Event.objects.create(
            club=self.club,
            title=title,
            event_type=Event.EVENT_TYPE_REGULAR,
            start_at=now,
            end_at=now + timedelta(hours=2),
            status=status,
            cancel_reason=cancel_reason,
            created_by=self.manager,
        )

    def apply_and_attend(self, event, user, attendance_status):
        application = EventApplication.objects.create(
            event=event,
            user=user,
            status=EventApplication.STATUS_APPLIED,
        )

        return Attendance.objects.create(
            event=event,
            user=user,
            application=application,
            status=attendance_status,
            checked_by=self.manager,
            checked_at=timezone.now(),
        )

    def create_schedule_data(self):
        first_event = self.create_event("Completed 1", Event.STATUS_COMPLETED)
        second_event = self.create_event("Completed 2", Event.STATUS_COMPLETED)
        self.create_event("Canceled 1", Event.STATUS_CANCELED)

        self.apply_and_attend(first_event, self.members[0], Attendance.STATUS_PRESENT)
        self.apply_and_attend(first_event, self.members[1], Attendance.STATUS_PRESENT)
        self.apply_and_attend(first_event, self.members[2], Attendance.STATUS_NO_SHOW)
        self.apply_and_attend(second_event, self.members[1], Attendance.STATUS_LATE)
        self.apply_and_attend(second_event, self.members[2], Attendance.STATUS_PRESENT)

    def create_finance_data(self):
        for user, status in [
            (self.members[0], MemberFeePayment.PAID),
            (self.members[1], MemberFeePayment.PAID),
            (self.members[2], MemberFeePayment.PAID),
            (self.members[3], MemberFeePayment.UNPAID),
        ]:
            MemberFeePayment.objects.create(
                club_id=self.club.id,
                user=user,
                status=status,
                amount=10000,
            )

        transactions = [
            FeeTransaction.objects.create(
                club_id=self.club.id,
                transaction_type=FeeTransaction.INCOME,
                transaction_date=date(2026, 5, 1),
                content="May fee",
                category="fee",
                amount=30000,
                created_by=self.manager,
            ),
            FeeTransaction.objects.create(
                club_id=self.club.id,
                transaction_type=FeeTransaction.EXPENSE,
                transaction_date=date(2026, 5, 2),
                content="Snacks",
                category="activity",
                amount=12000,
                created_by=self.manager,
            ),
            FeeTransaction.objects.create(
                club_id=self.club.id,
                transaction_type=FeeTransaction.EXPENSE,
                transaction_date=date(2026, 5, 3),
                content="Venue",
                category="operation",
                amount=8000,
                created_by=self.manager,
            ),
        ]

        for index, transaction in enumerate(transactions[:2], start=1):
            FeeReceipt.objects.create(
                transaction=transaction,
                file=SimpleUploadedFile(
                    f"receipt-{index}.pdf",
                    b"test receipt",
                    content_type="application/pdf",
                ),
                original_name=f"receipt-{index}.pdf",
            )

    def create_survey_data(self):
        survey = BiweeklySurvey.objects.create(
            club=self.club,
            year=2026,
            month=5,
            round_number=1,
            period_start_date=date(2026, 5, 1),
            period_end_date=date(2026, 5, 14),
            schedule_items=[],
            fee_items=[{"id": "fee-usage", "label": "Fee usage"}],
            created_by=self.manager,
        )

        for user, score in [
            (self.members[0], 4),
            (self.members[1], 5),
        ]:
            BiweeklySurveyResponse.objects.create(
                survey=survey,
                user=user,
                answers={"fee-usage": score},
                status=BiweeklySurveyResponse.STATUS_SUBMITTED,
                submitted_at=timezone.now(),
            )

    def test_impact_indicators_match_source_data_except_schedule_satisfaction(self):
        payload = build_health_analysis_payload(self.club)
        indicators = {
            item["key"]: item
            for item in payload["impactIndicators"]
            if item["key"] != "scheduleSatisfaction"
        }

        expected_values = {
            "memberActiveRate": 60,
            "memberAverageActivityScore": 60,
            "scheduleActivityRate": 100,
            "actualAttendanceRate": 80,
            "scheduleStabilityRate": 67,
            "paymentRate": 75,
            "receiptRate": 67,
            "feeSatisfaction": 4.5,
        }

        self.assertEqual(
            set(indicators),
            set(expected_values),
        )

        for key, expected_value in expected_values.items():
            with self.subTest(indicator=key):
                self.assertTrue(indicators[key]["dataReady"])
                self.assertEqual(indicators[key]["value"], expected_value)

        member_metrics = build_member_metrics(self.club)
        schedule_operation = build_schedule_operation_metrics(self.club)

        self.assertEqual(member_metrics["activeMemberCount"], 3)
        self.assertEqual(member_metrics["totalMemberCount"], 5)
        self.assertEqual(schedule_operation["totalAppliedCount"], 5)
        self.assertEqual(schedule_operation["totalAttendedCount"], 4)
        self.assertEqual(payload["financeDetail"]["paymentRate"], 75)
        self.assertEqual(payload["financeDetail"]["receiptRate"], 67)


class HealthSatisfactionIntegrationTests(TestCase):
    def setUp(self):
        self.User = get_user_model()
        self.manager = self.create_user("manager-kan65")
        self.member1 = self.create_user("member-kan65-1")
        self.member2 = self.create_user("member-kan65-2")
        self.member3 = self.create_user("member-kan65-3")

        self.club = Club.objects.create(
            name="Survey Health Club",
            category="IT",
            club_type="central",
            description="Test club",
            created_by=self.manager,
        )

        for user in [self.member1, self.member2, self.member3]:
            ManagedClubMembership.objects.create(
                user=user,
                club=self.club,
                status="regular",
                activity_score=50,
            )

        self.state = SurveyState.objects.create(
            club=self.club,
            survey_version=2,
        )

        SurveyItem.objects.create(
            club=self.club,
            item_type=SurveyItem.TYPE_SCHEDULE,
            original_id="1",
            title="Schedule 1",
        )
        SurveyItem.objects.create(
            club=self.club,
            item_type=SurveyItem.TYPE_SCHEDULE,
            original_id="2",
            title="Schedule 2",
        )
        SurveyItem.objects.create(
            club=self.club,
            item_type=SurveyItem.TYPE_FEE,
            original_id="3",
            title="Fee 3",
        )

    def create_user(self, username):
        user = self.User.objects.create_user(
            username=username,
            password="password",
            email=f"{username}@example.com",
        )
        Profile.objects.create(
            user=user,
            school_name="Test University",
            department="Computer Science",
            student_id=f"2026{user.id:04d}",
            nickname=username,
        )
        return user

    def submit(self, user, answers, version=2):
        return SurveySubmission.objects.create(
            club=self.club,
            user=user,
            answers=answers,
            submitted_version=version,
            has_submitted=True,
            submitted_at=timezone.now(),
        )

    def test_latest_survey_submission_drives_health_satisfaction(self):
        self.submit(
            self.member1,
            {
                "schedule-1": 5,
                "schedule-2": 3,
                "fee-3": 4,
            },
        )
        self.submit(
            self.member2,
            {
                "schedule-1": 1,
                "schedule-2": 1,
                "fee-3": 1,
            },
            version=1,
        )

        satisfaction = build_satisfaction_metrics(self.club)

        self.assertEqual(satisfaction["scheduleAverage"], 4.0)
        self.assertEqual(satisfaction["feeAverage"], 4.0)
        self.assertEqual(satisfaction["overallAverage"], 4.0)
        self.assertEqual(satisfaction["score"], 80)
        self.assertEqual(satisfaction["submittedCount"], 1)
        self.assertEqual(satisfaction["targetCount"], 3)
        self.assertEqual(satisfaction["responseRate"], 33)

        payload = build_health_analysis_payload(self.club)
        self.assertEqual(payload["satisfactionSummary"]["scheduleAverage"], 4.0)
        self.assertEqual(payload["satisfactionSummary"]["feeAverage"], 4.0)
        self.assertEqual(payload["satisfactionSummary"]["responseRate"], 33)

        indicators = {
            item["key"]: item
            for item in payload["impactIndicators"]
        }
        self.assertEqual(indicators["scheduleSatisfaction"]["value"], 4.0)
        self.assertEqual(indicators["feeSatisfaction"]["value"], 4.0)

    def test_response_rate_and_invalid_answers_do_not_change_score(self):
        self.submit(
            self.member1,
            {
                "schedule-1": 5,
                "schedule-2": 0,
                "schedule-999": 1,
                "fee-3": "abc",
                "fee-999": 1,
            },
        )

        satisfaction = build_satisfaction_metrics(self.club)

        self.assertEqual(satisfaction["scheduleAverage"], 5.0)
        self.assertIsNone(satisfaction["feeAverage"])
        self.assertEqual(satisfaction["overallAverage"], 5.0)
        self.assertEqual(satisfaction["score"], 100)
        self.assertEqual(satisfaction["responseRate"], 33)

    def test_survey_item_save_updates_schedule_date_response(self):
        client = APIClient()
        client.force_authenticate(user=self.manager)

        response = client.post(
            f"/api/clubs/{self.club.id}/surveys/items/",
            {
                "schedule_items": [
                    {
                        "id": "schedule-10",
                        "originalId": "10",
                        "title": "New schedule",
                    },
                ],
                "fee_items": [
                    {
                        "id": "fee-20",
                        "originalId": "20",
                        "title": "New fee",
                    },
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("schedule_updated_date", response.data)
        self.assertIn("fee_updated_date", response.data)
        self.assertTrue(response.data["schedule_updated_date"])

        response = client.get(f"/api/clubs/{self.club.id}/surveys/monthly/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data["schedule_updated_date"],
            response.data["fee_updated_date"],
        )
