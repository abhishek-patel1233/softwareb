import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Register() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "admin",
  });
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:5000/api/auth/register", formData);
      setMessage("Registration Successful! Redirecting to login...");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setMessage(err.response?.data?.message || "Registration Failed");
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "50px auto", padding: "20px", border: "1px solid #ccc", borderRadius: "8px" }}>
      <h2>Register Account</h2>
      {message && <p>{message}</p>}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "10px" }}>
          <label>Name:</label>
          <input type="text" name="name" value={formData.name} onChange={handleChange} required style={{ width: "100%", padding: "8px" }} />
        </div>
        <div style={{ marginBottom: "10px" }}>
          <label>Email:</label>
          <input type="email" name="email" value={formData.email} onChange={handleChange} required style={{ width: "100%", padding: "8px" }} />
        </div>
        <div style={{ marginBottom: "10px" }}>
          <label>Password:</label>
          <input type="password" name="password" value={formData.password} onChange={handleChange} required style={{ width: "100%", padding: "8px" }} />
        </div>
        <button type="submit" style={{ padding: "10px 15px", cursor: "pointer" }}>Register</button>
      </form>
    </div>
  );
}

export default Register;