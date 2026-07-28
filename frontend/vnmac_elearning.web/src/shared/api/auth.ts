import { apiRequest } from "./client";
import type {
  LoginRequest,
  LoginResponse,
  LogoutRequest,
  ChangePasswordRequest,
  RegisterRequest,
  RegisterResponse,
  ResendVerificationEmailRequest,
  UpdateProfileRequest,
  User,
  VerifyEmailRequest,
  VerifyEmailResponse,
} from "../types/api";

export function loginRequest(payload: LoginRequest) {
  return apiRequest<LoginResponse>("/api/auth/login", {
    method: "POST",
    auth: false,
    body: payload,
  });
}

export function registerRequest(payload: RegisterRequest) {
  return apiRequest<RegisterResponse>("/api/auth/register", {
    method: "POST",
    auth: false,
    body: payload,
  });
}

export function getProvinceOptions() {
  return apiRequest<string[]>("/api/auth/provinces", {
    auth: false,
  });
}

export function resendVerificationEmailRequest(payload: ResendVerificationEmailRequest) {
  return apiRequest<void>("/api/auth/resend-verification", {
    method: "POST",
    auth: false,
    body: payload,
  });
}

export function verifyEmailRequest(payload: VerifyEmailRequest) {
  return apiRequest<VerifyEmailResponse>("/api/auth/verify-email", {
    method: "POST",
    auth: false,
    body: payload,
  });
}

export function getCurrentUser() {
  return apiRequest<User>("/api/auth/me");
}

export function updateCurrentUserProfile(payload: UpdateProfileRequest) {
  return apiRequest<User>("/api/auth/profile", {
    method: "PUT",
    body: payload,
  });
}

export function changeCurrentUserPassword(payload: ChangePasswordRequest) {
  return apiRequest<void>("/api/auth/password", {
    method: "PUT",
    body: payload,
  });
}

export function logoutRequest(payload: LogoutRequest) {
  return apiRequest<void>("/api/auth/logout", {
    method: "POST",
    body: payload,
  });
}
