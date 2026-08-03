import axiosClient from './axiosClient';

const authApi = {
  login: ({ email, password }) =>
    axiosClient.post('/auth/login', { email, password }),

  refreshToken: (refreshToken) =>
    axiosClient.post('/auth/refresh-token', { refreshToken }),

  googleLogin: (idToken) =>
    axiosClient.post('/auth/google-login', { idToken }),

  sendOtp: (email) =>
    axiosClient.post('/auth/send-otp', { email }),

  verifyOtp: ({ email, otp }) =>
    axiosClient.post('/auth/verify-otp', { email, otp }),

  registerPersonal: (formData, registrationToken) =>
    axiosClient.post('/Personal/Register', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(registrationToken ? { 'X-Registration-Token': registrationToken } : {}),
      },
    }),
};

export default authApi;
