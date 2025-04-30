
import { useEffect, useState, ReactNode } from "react";
import { useNavigate } from "react-router-dom";

const AuthCheck = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const isAuthenticated = localStorage.getItem("isAuthenticated");
    if (!isAuthenticated) {
      navigate("/login");
    } else {
      setIsLoading(false);
    }
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Checking authentication...</div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthCheck;
