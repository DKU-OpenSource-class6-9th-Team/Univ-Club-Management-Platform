const API_BASE_URL = "http://127.0.0.1:8000/api/accounts";

export async function getAccountsApiHome() {
  const response = await fetch(`${API_BASE_URL}/`);
  return response.json();
}