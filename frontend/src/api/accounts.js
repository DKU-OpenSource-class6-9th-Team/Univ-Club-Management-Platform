const API_BASE_URL = "http://localhost:8000/api/accounts";

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
  await fetch(`${API_BASE_URL}/csrf/`, {
    credentials: "include",
  });

  const csrfToken = getCookie("csrftoken");

  return csrfToken
    ? { "X-CSRFToken": csrfToken }
    : {};
}

export async function getAccountsApiHome() {
  const response = await fetch(`${API_BASE_URL}/`, {
    credentials: "include",
  });
  return response.json();
}

export async function signup(signupData) {
  const response = await fetch(`${API_BASE_URL}/signup/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(signupData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw data;
  }

  return data;
}

export async function login(loginData) {
  const response = await fetch(`${API_BASE_URL}/login/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(loginData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw data;
  }

  return data;
}

export async function logout() {
  const csrfHeaders = await getCsrfHeaders();

  const response = await fetch(`${API_BASE_URL}/logout/`, {
    method: "POST",
    headers: {
      ...csrfHeaders,
    },
    credentials: "include",
  });

  const data = await response.json();

  localStorage.removeItem("loginUser");

  if (!response.ok) {
    throw data;
  }

  return data;
}

export async function getCurrentUser() {
  const response = await fetch(`${API_BASE_URL}/me/`, {
    credentials: "include",
  });

  const data = await response.json();

  if (!response.ok) {
    throw data;
  }

  return data;
}

export async function getProfile() {
  const response = await fetch(`${API_BASE_URL}/profile/`, {
    credentials: "include",
  });

  const data = await response.json();

  if (!response.ok) {
    throw data;
  }

  return data;
}

export async function updateProfile(profileData) {
  const csrfHeaders = await getCsrfHeaders();

  const response = await fetch(`${API_BASE_URL}/profile/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...csrfHeaders,
    },
    credentials: "include",
    body: JSON.stringify(profileData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw data;
  }

  return data;
}

export async function delete_account(deleteAccountData) {
  const csrfHeaders = await getCsrfHeaders();

  const response = await fetch(`${API_BASE_URL}/delete-account/`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...csrfHeaders,
    },
    credentials: "include",
    body: JSON.stringify(deleteAccountData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw data;
  }

  localStorage.removeItem("loginUser");

  return data;
}