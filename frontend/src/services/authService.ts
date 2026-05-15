import axios from "axios";

export const loginUser = async (
  email: string,
  password: string
) => {

  console.log("LOGIN API CALLED");

  const response = await axios.post(
    "http://localhost:8000/login",
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