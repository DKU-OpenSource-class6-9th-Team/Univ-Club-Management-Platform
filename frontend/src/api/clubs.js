const API_BASE_URL = "http://localhost:8000/api/clubs";

function getCookie(name) {
  const cookies = document.cookie.split('; ');

  for (const cookie of cookies) {
    const [key, value] = cookie.split('=');

    if (key === name) {
      return decodeURIComponent(value);
    }
  }

  return null;
}

async function getCsrfHeaders() {
  await fetch("http://localhost:8000/api/accounts/csrf/", {
    credentials: "include",
  });

  const csrfToken = getCookie("csrftoken");

  return csrfToken
    ? { "X-CSRFToken": csrfToken }
    : {};
}

// 전체 동아리 목록 조회
export async function getClubs() {
  const response = await fetch(`${API_BASE_URL}/`, {
    credentials: "include",
  });

  const data = await response.json();

  if (!response.ok) {
    throw data;
  }

  return data;
}

// 특정 동아리 상세 조회
export async function getClub(clubId) {
  const response = await fetch(`${API_BASE_URL}/${clubId}/`, {
    credentials: "include",
  });

  const data = await response.json();

  if (!response.ok) {
    throw data;
  }

  return data;
}

// 동아리 등록
export async function createClub(clubData) {
  const csrfHeaders = await getCsrfHeaders();

  const formData = new FormData();

  formData.append("name", clubData.name);
  formData.append("category", clubData.category);
  formData.append("club_type", clubData.club_type);
  formData.append("description", clubData.description);
  formData.append("is_recruiting", clubData.is_recruiting);
  formData.append("recruit_start_date", clubData.recruit_start_date);
  formData.append("recruit_end_date", clubData.recruit_end_date);
  formData.append("capacity", clubData.capacity);
  formData.append("recruit_members", clubData.recruit_members);
  formData.append("leader_name", clubData.leader_name);
  formData.append("contact_phone", clubData.contact_phone);
  formData.append("contact_email", clubData.contact_email);
  formData.append("location", clubData.location);

  if (clubData.image) {
    formData.append("image", clubData.image);
  }

  const response = await fetch(`${API_BASE_URL}/`, {
    method: "POST",
    headers: {
      ...csrfHeaders,
    },
    credentials: "include",
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw data;
  }

  return data;
}

// 동아리 정보 수정
export async function updateClub(clubId, clubData) {
  const csrfHeaders = await getCsrfHeaders();

  const formData = new FormData();

  formData.append("name", clubData.name);
  formData.append("category", clubData.category);
  formData.append("club_type", clubData.club_type);
  formData.append("description", clubData.description);
  formData.append("is_recruiting", clubData.is_recruiting);
  formData.append("recruit_start_date", clubData.recruit_start_date);
  formData.append("recruit_end_date", clubData.recruit_end_date);
  formData.append("capacity", clubData.capacity);
  formData.append("recruit_members", clubData.recruit_members);
  formData.append("leader_name", clubData.leader_name);
  formData.append("contact_phone", clubData.contact_phone);
  formData.append("contact_email", clubData.contact_email);
  formData.append("location", clubData.location);
  formData.append("remove_image", clubData.remove_image ? "true" : "false");

  if (clubData.image) {
    formData.append("image", clubData.image);
  }

  const response = await fetch(`${API_BASE_URL}/${clubId}/`, {
    method: "PATCH",
    headers: {
      ...csrfHeaders,
    },
    credentials: "include",
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw data;
  }

  return data;
}

/* 내가 가입하거나 관리 중인 동아리 목록 조회
현재 로그인한 사용자가 속한 동아리 목록을 가져옴 */
export async function getMyClubs() {

  const response = await fetch(`${API_BASE_URL}/my/`, {
    credentials: "include",
  });

  const data = await response.json();

  if (!response.ok) {
    throw data;
  }

  return data;
}

// 동아리 가입 신청
export async function requestJoinClub(clubId) {
  const csrfHeaders = await getCsrfHeaders();

  const response = await fetch(`${API_BASE_URL}/${clubId}/join/`, {
    method: "POST",
    headers: {
      ...csrfHeaders,
    },
    credentials: "include",
  });

  const data = await response.json();

  if (!response.ok) {
    throw data;
  }

  return data;
}

// 동아리 건강도 랭킹 조회
export async function getClubHealthRanking() {
  const response = await fetch(`${API_BASE_URL}/health-ranking/`, {
    credentials: "include",
  });

  const data = await response.json();

  if (!response.ok) {
    throw data;
  }

  return data;
}