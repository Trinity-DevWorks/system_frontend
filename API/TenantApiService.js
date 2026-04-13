import { tenantRequest } from "@/lib/axios";

const tenantApiService = async (method, endpoint, data = null, config = {}) =>
  tenantRequest(method, endpoint, data, config);

export default tenantApiService;
