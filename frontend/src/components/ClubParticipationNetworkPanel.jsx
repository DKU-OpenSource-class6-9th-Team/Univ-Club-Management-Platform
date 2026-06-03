import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  GitBranch,
  RefreshCw,
  Save,
  Tag,
  Trash2,
  X,
} from 'lucide-react';

import {
  createRelationObservation,
  deleteRelationObservation,
  fetchClubMemberNetwork,
  fetchClubMemberNetworkDetail,
  updateRelationObservation,
} from '../api/clubMembers.js';

const TAG_OPTIONS = [
  { value: 'frequent', label: '자주 함께 활동함' },
  { value: 'new_member_help', label: '신입 적응 도움 관계' },
  { value: 'officer_mentoring', label: '운영진 멘토링 관계' },
  { value: 'same_group', label: '같은 소그룹' },
  { value: 'need_watch', label: '관찰 필요' },
  { value: 'relation_bias', label: '관계 편중' },
];

function getErrorMessage(error, fallbackMessage) {
  if (typeof error === 'string') {
    return error;
  }

  if (error?.message) {
    return error.message;
  }

  if (error?.non_field_errors?.length > 0) {
    return error.non_field_errors[0];
  }

  if (Array.isArray(error)) {
    return error[0];
  }

  return fallbackMessage;
}

function getStateIcon(state) {
  if (state === 'stable') {
    return <CheckCircle size={15} />;
  }

  if (state === 'risk' || state === 'watch') {
    return <AlertTriangle size={15} />;
  }

  return <GitBranch size={15} />;
}

function ClubParticipationNetworkPanel({ clubId, members = [] }) {
  const [networkData, setNetworkData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const [selectedMember, setSelectedMember] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailErrorMessage, setDetailErrorMessage] = useState('');

  const [observationForm, setObservationForm] = useState({
    to_member: '',
    tag: 'frequent',
    memo: '',
  });
  const [observationErrorMessage, setObservationErrorMessage] = useState('');
  const [isSavingObservation, setIsSavingObservation] = useState(false);

  const [editingObservationId, setEditingObservationId] = useState(null);
  const [editingForm, setEditingForm] = useState({
    tag: 'frequent',
    memo: '',
  });

  const loadNetwork = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');

      const data = await fetchClubMemberNetwork(clubId);
      setNetworkData(data);
    } catch (error) {
      console.error('참여 연결도 분석 정보를 불러오지 못했습니다.', error);
      setErrorMessage(
        getErrorMessage(error, '참여 연결도 분석 정보를 불러오지 못했습니다.')
      );
    } finally {
      setIsLoading(false);
    }
  }, [clubId]);

  const loadDetail = useCallback(
    async (membershipId) => {
      try {
        setIsDetailLoading(true);
        setDetailErrorMessage('');

        const data = await fetchClubMemberNetworkDetail(clubId, membershipId);
        setDetailData(data);
      } catch (error) {
        console.error('참여 연결도 상세 정보를 불러오지 못했습니다.', error);
        setDetailErrorMessage(
          getErrorMessage(error, '참여 연결도 상세 정보를 불러오지 못했습니다.')
        );
      } finally {
        setIsDetailLoading(false);
      }
    },
    [clubId]
  );

  useEffect(() => {
    loadNetwork();
  }, [loadNetwork]);

  const networkMembers = networkData?.members || [];
  const summary = networkData?.summary || {};

  const handleOpenDetail = async (member) => {
    setSelectedMember(member);
    setDetailData(null);
    setObservationErrorMessage('');
    setObservationForm({
      to_member: '',
      tag: 'frequent',
      memo: '',
    });

    await loadDetail(member.membership_id);
  };

  const handleCloseDetail = () => {
    setSelectedMember(null);
    setDetailData(null);
    setDetailErrorMessage('');
    setObservationErrorMessage('');
    setEditingObservationId(null);
  };

  const partnerOptions = useMemo(() => {
    if (!selectedMember) {
      return [];
    }

    const optionMap = new Map();

    if (detailData?.relations) {
      detailData.relations.forEach((relation) => {
        const fromMember = relation.from_member;
        const toMember = relation.to_member;

        const partner =
          fromMember.membership_id === selectedMember.membership_id
            ? toMember
            : fromMember;

        optionMap.set(partner.membership_id, partner);
      });
    }

    members.forEach((member) => {
      if (member.id !== selectedMember.membership_id) {
        optionMap.set(member.id, {
          membership_id: member.id,
          name: member.name,
          role_display: member.role_display,
          status_display: member.status_display,
        });
      }
    });

    return Array.from(optionMap.values());
  }, [detailData, members, selectedMember]);

  const handleObservationFormChange = (event) => {
    const { name, value } = event.target;

    setObservationForm((prevForm) => ({
      ...prevForm,
      [name]: value,
    }));
  };

  const handleCreateObservation = async (event) => {
    event.preventDefault();

    if (!selectedMember) {
      return;
    }

    if (!observationForm.to_member) {
      setObservationErrorMessage('관계 대상 회원을 선택해야 합니다.');
      return;
    }

    try {
      setIsSavingObservation(true);
      setObservationErrorMessage('');

      await createRelationObservation(clubId, {
        from_member: selectedMember.membership_id,
        to_member: Number(observationForm.to_member),
        tag: observationForm.tag,
        memo: observationForm.memo,
      });

      setObservationForm({
        to_member: '',
        tag: 'frequent',
        memo: '',
      });

      await Promise.all([
        loadNetwork(),
        loadDetail(selectedMember.membership_id),
      ]);
    } catch (error) {
      console.error('관계 관찰 기록 등록에 실패했습니다.', error);
      setObservationErrorMessage(
        getErrorMessage(error, '관계 관찰 기록 등록에 실패했습니다.')
      );
    } finally {
      setIsSavingObservation(false);
    }
  };

  const handleStartEditObservation = (observation) => {
    setEditingObservationId(observation.id);
    setEditingForm({
      tag: observation.tag,
      memo: observation.memo || '',
    });
  };

  const handleEditFormChange = (event) => {
    const { name, value } = event.target;

    setEditingForm((prevForm) => ({
      ...prevForm,
      [name]: value,
    }));
  };

  const handleUpdateObservation = async (observationId) => {
    if (!selectedMember) {
      return;
    }

    try {
      setObservationErrorMessage('');

      await updateRelationObservation(clubId, observationId, editingForm);

      setEditingObservationId(null);

      await Promise.all([
        loadNetwork(),
        loadDetail(selectedMember.membership_id),
      ]);
    } catch (error) {
      console.error('관계 관찰 기록 수정에 실패했습니다.', error);
      setObservationErrorMessage(
        getErrorMessage(error, '관계 관찰 기록 수정에 실패했습니다.')
      );
    }
  };

  const handleDeleteObservation = async (observationId) => {
    if (!selectedMember) {
      return;
    }

    if (!window.confirm('이 관계 관찰 기록을 삭제할까요?')) {
      return;
    }

    try {
      setObservationErrorMessage('');

      await deleteRelationObservation(clubId, observationId);

      await Promise.all([
        loadNetwork(),
        loadDetail(selectedMember.membership_id),
      ]);
    } catch (error) {
      console.error('관계 관찰 기록 삭제에 실패했습니다.', error);
      setObservationErrorMessage(
        getErrorMessage(error, '관계 관찰 기록 삭제에 실패했습니다.')
      );
    }
  };

  const renderRelationPartner = (relation) => {
    if (!selectedMember) {
      return null;
    }

    const fromMember = relation.from_member;
    const toMember = relation.to_member;

    return fromMember.membership_id === selectedMember.membership_id
      ? toMember
      : fromMember;
  };

  return (
    <>
      <article className="club-network-panel">
        <div className="club-network-header">
          <div>
            <h2>참여 연결도 분석</h2>
            <p>
              출석 데이터를 기반으로 회원이 동아리 안에서 얼마나 다양한 사람들과
              연결되어 있는지 분석합니다.
            </p>
          </div>

          <div className="club-network-header-actions">
            <button
              type="button"
              className="club-network-refresh-button"
              onClick={loadNetwork}
              disabled={isLoading}
            >
              <RefreshCw size={16} />
              새로고침
            </button>

            <GitBranch size={23} />
          </div>
        </div>

        {isLoading ? (
          <div className="club-member-empty-box">
            <p>참여 연결도 분석 정보를 불러오는 중입니다.</p>
          </div>
        ) : errorMessage ? (
          <div className="club-member-empty-box error">
            <p>{errorMessage}</p>
          </div>
        ) : (
          <>
            <div className="club-network-summary-grid">
              <div className="club-network-summary-card">
                <span>평균 연결 점수</span>
                <strong>{summary.average_score ?? 0}점</strong>
                <p>전체 회원의 평균 조직 연결도입니다.</p>
              </div>

              <div className="club-network-summary-card risk">
                <span>저연결 위험</span>
                <strong>{summary.risk_count ?? 0}명</strong>
                <p>조직 내 접점이 낮은 회원입니다.</p>
              </div>

              <div className="club-network-summary-card watch">
                <span>관찰 필요</span>
                <strong>{summary.watch_count ?? 0}명</strong>
                <p>추가 확인이 필요한 회원입니다.</p>
              </div>

              <div className="club-network-summary-card">
                <span>분석 일정</span>
                <strong>{summary.analyzed_event_count ?? 0}개</strong>
                <p>완료된 일정 기준으로 분석했습니다.</p>
              </div>
            </div>

            {networkMembers.length === 0 ? (
              <div className="club-member-empty-box">
                <p>참여 연결도 분석 대상 회원이 없습니다.</p>
              </div>
            ) : (
              <div className="club-network-table-wrap">
                <div className="club-network-table">
                  <div className="club-network-table-head">
                    <span>이름</span>
                    <span>역할</span>
                    <span>상태</span>
                    <span>연결 점수</span>
                    <span>연결 상태</span>
                    <span>유효 연결</span>
                    <span>운영진 접점</span>
                    <span>관계 편중</span>
                    <span>주요 이유</span>
                    <span>상세</span>
                  </div>

                  {networkMembers.map((member) => (
                    <div className="club-network-table-row" key={member.membership_id}>
                      <span className="member-name">{member.name}</span>
                      <span>{member.role_display}</span>
                      <span>{member.status_display}</span>
                      <span>{member.connection_score}점</span>
                      <span>
                        <em className={`network-state-badge ${member.connection_state}`}>
                          {getStateIcon(member.connection_state)}
                          {member.connection_state_display}
                        </em>
                      </span>
                      <span>{member.effective_connection_count}명</span>
                      <span>{member.officer_touch_strength}</span>
                      <span>{member.max_relation_ratio}%</span>
                      <span className="network-reason-cell">
                        {member.reasons?.[0] || '-'}
                      </span>
                      <span>
                        <button
                          type="button"
                          className="network-detail-button"
                          onClick={() => handleOpenDetail(member)}
                        >
                          상세
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </article>

      {selectedMember && (
        <div className="member-update-modal-backdrop">
          <div className="member-update-modal network-detail-modal">
            <div className="member-update-modal-header">
              <div>
                <h3>{selectedMember.name} 참여 연결도 상세</h3>
                <p>
                  자동 분석 결과와 운영진 관계 태그/메모를 함께 확인합니다.
                </p>
              </div>

              <button
                type="button"
                className="member-update-modal-close"
                onClick={handleCloseDetail}
              >
                <X size={18} />
              </button>
            </div>

            {isDetailLoading ? (
              <div className="club-member-empty-box">
                <p>상세 분석 정보를 불러오는 중입니다.</p>
              </div>
            ) : detailErrorMessage ? (
              <div className="club-member-empty-box error">
                <p>{detailErrorMessage}</p>
              </div>
            ) : detailData?.member ? (
              <div className="network-detail-content">
                <div className="network-detail-score-box">
                  <div>
                    <span>최종 연결 점수</span>
                    <strong>{detailData.member.connection_score}점</strong>
                    <p>{detailData.member.connection_state_display}</p>
                  </div>

                  <div>
                    <span>자동 점수</span>
                    <strong>{detailData.member.auto_score}점</strong>
                    <p>출석 데이터 기반 계산값</p>
                  </div>

                  <div>
                    <span>태그 보정</span>
                    <strong>
                      {detailData.member.tag_adjustment > 0 ? '+' : ''}
                      {detailData.member.tag_adjustment}
                    </strong>
                    <p>운영진 관찰 태그 반영</p>
                  </div>
                </div>

                <div className="network-detail-score-parts">
                  <div>
                    <span>연결 폭</span>
                    <strong>{detailData.member.score_parts.width_score}</strong>
                  </div>
                  <div>
                    <span>연결 강도</span>
                    <strong>{detailData.member.score_parts.strength_score}</strong>
                  </div>
                  <div>
                    <span>조직 접점</span>
                    <strong>{detailData.member.score_parts.organization_score}</strong>
                  </div>
                  <div>
                    <span>다양성</span>
                    <strong>{detailData.member.score_parts.diversity_score}</strong>
                  </div>
                  <div>
                    <span>최근 연결</span>
                    <strong>{detailData.member.score_parts.recent_score}</strong>
                  </div>
                </div>

                <div className="network-detail-reason-box">
                  <h4>분석 이유</h4>
                  <ul>
                    {detailData.member.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </div>

                <form
                  className="network-observation-form"
                  onSubmit={handleCreateObservation}
                >
                  <h4>
                    <Tag size={17} />
                    운영진 관계 태그/메모 추가
                  </h4>

                  <div className="network-observation-form-grid">
                    <label>
                      관계 대상
                      <select
                        name="to_member"
                        value={observationForm.to_member}
                        onChange={handleObservationFormChange}
                      >
                        <option value="">회원 선택</option>
                        {partnerOptions.map((partner) => (
                          <option
                            key={partner.membership_id}
                            value={partner.membership_id}
                          >
                            {partner.name} ({partner.role_display || '역할 없음'})
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      관계 태그
                      <select
                        name="tag"
                        value={observationForm.tag}
                        onChange={handleObservationFormChange}
                      >
                        {TAG_OPTIONS.map((tag) => (
                          <option key={tag.value} value={tag.value}>
                            {tag.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label>
                    운영진 메모
                    <textarea
                      name="memo"
                      rows="3"
                      placeholder="활동 중 관찰한 관계 특징이나 관리 참고 사항을 입력하세요."
                      value={observationForm.memo}
                      onChange={handleObservationFormChange}
                    />
                  </label>

                  {observationErrorMessage && (
                    <p className="member-update-error-message">
                      {observationErrorMessage}
                    </p>
                  )}

                  <button
                    type="submit"
                    className="member-update-save-button"
                    disabled={isSavingObservation}
                  >
                    <Save size={15} />
                    {isSavingObservation ? '저장 중...' : '태그/메모 저장'}
                  </button>
                </form>

                <div className="network-relation-list">
                  <h4>공동 참여 관계</h4>

                  {detailData.relations.length === 0 ? (
                    <div className="club-member-empty-box">
                      <p>아직 공동 참여 관계가 없습니다.</p>
                    </div>
                  ) : (
                    detailData.relations.map((relation) => {
                      const partner = renderRelationPartner(relation);

                      return (
                        <div
                          className="network-relation-card"
                          key={`${relation.from_member.membership_id}-${relation.to_member.membership_id}`}
                        >
                          <div className="network-relation-card-header">
                            <div>
                              <strong>{partner?.name}</strong>
                              <p>
                                공동 참여 강도 {relation.strength} · 공동 참여 {relation.event_count}회
                              </p>
                            </div>

                            <span>{partner?.role_display}</span>
                          </div>

                          {relation.event_titles?.length > 0 && (
                            <p className="network-relation-events">
                              주요 일정: {relation.event_titles.join(', ')}
                            </p>
                          )}

                          {relation.observations?.length > 0 && (
                            <div className="network-observation-list">
                              {relation.observations.map((observation) => (
                                <div
                                  className="network-observation-item"
                                  key={observation.id}
                                >
                                  {editingObservationId === observation.id ? (
                                    <div className="network-observation-edit-box">
                                      <select
                                        name="tag"
                                        value={editingForm.tag}
                                        onChange={handleEditFormChange}
                                      >
                                        {TAG_OPTIONS.map((tag) => (
                                          <option key={tag.value} value={tag.value}>
                                            {tag.label}
                                          </option>
                                        ))}
                                      </select>

                                      <textarea
                                        name="memo"
                                        rows="2"
                                        value={editingForm.memo}
                                        onChange={handleEditFormChange}
                                      />

                                      <div className="network-observation-actions">
                                        <button
                                          type="button"
                                          className="member-update-save-button"
                                          onClick={() => handleUpdateObservation(observation.id)}
                                        >
                                          저장
                                        </button>

                                        <button
                                          type="button"
                                          className="member-update-cancel-button"
                                          onClick={() => setEditingObservationId(null)}
                                        >
                                          취소
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <div>
                                        <em>{observation.tag_display}</em>
                                        <span>
                                          {observation.score_value > 0 ? '+' : ''}
                                          {observation.score_value}
                                        </span>
                                      </div>

                                      {observation.memo && (
                                        <p>{observation.memo}</p>
                                      )}

                                      <div className="network-observation-actions">
                                        <button
                                          type="button"
                                          onClick={() => handleStartEditObservation(observation)}
                                        >
                                          수정
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => handleDeleteObservation(observation.id)}
                                        >
                                          <Trash2 size={14} />
                                          삭제
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}

export default ClubParticipationNetworkPanel;