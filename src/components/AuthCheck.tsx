
import { useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";

const AuthCheck = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  
  useEffect(() => {
    const isAuthenticated = localStorage.getItem("isAuthenticated");
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [navigate]);

  return <>{children}</>;
};

export default AuthCheck;
