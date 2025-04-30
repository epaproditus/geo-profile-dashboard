
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Small timeout to ensure localStorage check works properly
    setTimeout(() => {
      const isAuthenticated = localStorage.getItem("isAuthenticated");
      if (isAuthenticated) {
        navigate("/dashboard");
      } else {
        navigate("/login");
      }
      setIsLoading(false);
    }, 300);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse">Redirecting...</div>
    </div>
  );
};

export default Index;
