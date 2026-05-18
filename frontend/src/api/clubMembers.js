const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function fetchClubMembers(clubId) {
  if (!clubId) {
    throw new Error("동아리 ID가 없습니다.");
  }

  const response = await fetch(`${API_BASE_URL}/clubs/${clubId}/members/`, {
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