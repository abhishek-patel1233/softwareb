import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

function Login() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:5000/api/auth/login", formData);
      localStorage.setItem("userInfo", JSON.stringify(res.data));
      setMessage("Login Successful!");
      setTimeout(() => navigate("/dashboard"), 1000);
    } catch (err) {
      setMessage(err.response?.data?.message || "Login Failed");
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "50px auto", padding: "20px", border: "1px solid #ccc", borderRadius: "8px" }}>
      <h2>Login Account</h2>
      {message && <p>{message}</p>}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "10px" }}>
          <label>Email:</label>
          <input type="email" name="email" value={formData.email} onChange={handleChange} required style={{ width: "100%", padding: "8px", marginTop: "5px" }} />
        </div>
        <div style={{ marginBottom: "10px" }}>
          <label>Password:</label>
          <input type="password" name="password" value={formData.password} onChange={handleChange} required style={{ width: "100%", padding: "8px", marginTop: "5px" }} />
        </div>
        <button type="submit" style={{ width: "100%", padding: "10px", backgroundColor: "#2c3e50", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}>Login</button>
      </form>
      <p style={{ marginTop: "15px", textAlign: "center" }}>
        Don't have an account? <Link to="/register">Register here</Link>
      </p>
    </div>
  );
}

export default Login;