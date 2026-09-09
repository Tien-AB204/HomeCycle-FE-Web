import axiosClient from "./axiosClient";

const unwrapResult = (result) => {
  if (
    result?.success === false ||
    result?.isSuccess === false
  ) {
    throw new Error(
      result?.error?.message ||
        result?.message ||
        "Không thể tải quy định tải tệp.",
    );
  }

  const policy = result?.data ?? result;

  if (
    !policy?.config ||
    !Array.isArray(policy.config.rules)
  ) {
    throw new Error(
      "Máy chủ chưa trả cấu hình tải tệp hợp lệ.",
    );
  }

  return policy;
};

const publicPlatformPolicyApi = {
  getFileUpload: async ({ signal } = {}) => {
    const result = await axiosClient.get(
      "/platform-policies/file-upload",
      { signal },
    );

    return unwrapResult(result);
  },
};

export default publicPlatformPolicyApi;