import axios from "axios";

export const loginUser = async (
  email: string,
  password: string
) => {

  console.log("LOGIN API CALLED");

  const response = await axios.post(
  "https://employee-ai-workforce-intelligence.onrender.com/auth/login",
    {
      email,
      password,
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  console.log("API RESPONSE:", response.data);

  return response.data;
};