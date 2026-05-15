import api from "./api";

export const getEmployees = async () => {
  const response = await api.get("/employees");
  return response.data;
};

export const getEmployeeById = async (id: string) => {
  const response = await api.get(`/employees/${id}`);
  return response.data;
};

export const predictAttrition = async (data: any) => {
  const response = await api.post("/predict", data);
  return response.data;
};