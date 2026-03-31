import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import Header from "./Header";
import BottomNav from "./BottomNav";
import ChatWidget from "../Chat/ChatWidget";
import { Outlet } from "react-router-dom";

interface AppLayoutProps {
  children?: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const location = useLocation();
  const isAuthPage = ["/login", "/register"].includes(location.pathname);

  if (isAuthPage) {
    return children || <Outlet />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pb-24 pt-20 px-4 max-w-7xl mx-auto">
        {children || <Outlet />}
      </main>
      <BottomNav />
      <ChatWidget />
    </div>
  );
};

export default AppLayout;
