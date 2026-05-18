const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function fetchClubMembers(clubId, filters = {}) {
  if (!clubId) {
    throw new Error("동아리 ID가 없습니다.");
  }

  const queryParams = new URLSearchParams();

  if (filters.search) {
    queryParams.append("search", filters.search);
  }

  if (filters.role) {
    queryParams.append("role", filters.role);
  }

  if (filters.status) {
    queryParams.append("status", filters.status);
  }

  if (filters.minScore !== undefined && filters.minScore !== "") {
    queryParams.append("min_score", filters.minScore);
  }

  if (filters.maxScore !== undefined && filters.maxScore !== "") {
    queryParams.append("max_score", filters.maxScore);
  }

  const queryString = queryParams.toString();

  const url = queryString
    ? `${API_BASE_URL}/clubs/${clubId}/members/?${queryString}`
    : `${API_BASE_URL}/clubs/${clubId}/members/`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  const data = await response.json();

  if (!response.ok) {
    throw data;
  }

  return data;
}