const API_BASE_URL = "http://127.0.0.1:8000/api/accounts";

export async function getAccountsApiHome() {
  const response = await fetch(`${API_BASE_URL}/`);
  return response.json();
}

export async function signup(signupData) {
  const response = await fetch(`${API_BASE_URL}/signup/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(signupData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw data;
  }

  return data;
}