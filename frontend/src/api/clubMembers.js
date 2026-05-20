const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

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
  await fetch(`${API_BASE_URL}/accounts/csrf/`, {
    credentials: 'include',
  });

  const csrfToken = getCookie('csrftoken');

  return csrfToken
    ? { 'X-CSRFToken': csrfToken }
    : {};
}

export async function fetchClubMembers(clubId, filters = {}) {
  if (!clubId) {
    throw new Error('동아리 ID가 없습니다.');
  }

  const queryParams = new URLSearchParams();

  if (filters.search) {
    queryParams.append('search', filters.search);
  }

  if (filters.role) {
    queryParams.append('role', filters.role);
  }

  if (filters.status) {
    queryParams.append('status', filters.status);
  }

  if (filters.minScore !== undefined && filters.minScore !== '') {
    queryParams.append('min_score', filters.minScore);
  }

  if (filters.maxScore !== undefined && filters.maxScore !== '') {
    queryParams.append('max_score', filters.maxScore);
  }

  const queryString = queryParams.toString();

  const url = queryString
    ? `${API_BASE_URL}/clubs/${clubId}/members/?${queryString}`
    : `${API_BASE_URL}/clubs/${clubId}/members/`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  const data = await response.json();

  if (!response.ok) {
    throw data;
  }

  return data;
}

export async function fetchClubJoinRequests(clubId) {
  if (!clubId) {
    throw new Error('동아리 ID가 없습니다.');
  }

  const response = await fetch(`${API_BASE_URL}/clubs/${clubId}/join-requests/`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  const data = await response.json();

  if (!response.ok) {
    throw data;
  }

  return data;
}

export async function approveClubJoinRequest(clubId, membershipId) {
  if (!clubId || !membershipId) {
    throw new Error('가입 신청 정보가 없습니다.');
  }

  const csrfHeaders = await getCsrfHeaders();

  const response = await fetch(
    `${API_BASE_URL}/clubs/${clubId}/join-requests/${membershipId}/approve/`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...csrfHeaders,
      },
      credentials: 'include',
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw data;
  }

  return data;
}

export async function rejectClubJoinRequest(clubId, membershipId) {
  if (!clubId || !membershipId) {
    throw new Error('가입 신청 정보가 없습니다.');
  }

  const csrfHeaders = await getCsrfHeaders();

  const response = await fetch(
    `${API_BASE_URL}/clubs/${clubId}/join-requests/${membershipId}/reject/`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...csrfHeaders,
      },
      credentials: 'include',
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw data;
  }

  return data;
}

export async function updateClubMember(clubId, membershipId, payload) {
  if (!clubId || !membershipId) {
    throw new Error('동아리원 정보가 없습니다.');
  }

  const csrfHeaders = await getCsrfHeaders();

  const response = await fetch(
    `${API_BASE_URL}/clubs/${clubId}/members/${membershipId}/`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...csrfHeaders,
      },
      credentials: 'include',
      body: JSON.stringify(payload),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw data;
  }

  return data;
}

export async function fetchClubMemberDetail(clubId, membershipId) {
  if (!clubId || !membershipId) {
    throw new Error('동아리원 정보가 없습니다.');
  }

  const response = await fetch(
    `${API_BASE_URL}/clubs/${clubId}/members/${membershipId}/`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw data;
  }

  return data;
}