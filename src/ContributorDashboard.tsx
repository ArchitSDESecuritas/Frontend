import React, { useEffect, useState } from "react";
import {
  Folder,
  Clock,
  HelpCircle,
  ThumbsUp,
  CheckCircle2,
  ListChecks,
  Ban,
  ListTodo,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import bgVideo from "./assets/video/the_element_related_to_BGV.mp4";
import { useAuth } from "./useAuth";
import axios from "axios";
import { API_ENDPOINTS, getAPI_HEADER } from "./endpoint";
import { ContributorBarChart } from "./Components/DashboardCharts";
 
// Icon mapping for card types (as fallback/icons per column name)
const columnIconMap: { [key: string]: React.ElementType } = {
  ContributorCount: Folder,
  TotalRequest: ListChecks,
  CompletedRequest: CheckCircle2,
  PendingRequest: Ban,
  InProgressRequest: ListTodo,
};
 
// Color mapping for card types
const columnColorMap: {
  [key: string]: {
    colorClass: string;
    barColor: string;
    iconBg: string;
  };
} = {
  ContributorCount: {
    colorClass: "text-indigo-500",
    barColor: "bg-indigo-500",
    iconBg: "bg-indigo-50 text-indigo-500",
  },
  TotalRequest: {
    colorClass: "text-blue-500",
    barColor: "bg-blue-500",
    iconBg: "bg-blue-50 text-blue-500",
  },
  CompletedRequest: {
    colorClass: "text-emerald-500",
    barColor: "bg-emerald-500",
    iconBg: "bg-emerald-50 text-emerald-500",
  },
  PendingRequest: {
    colorClass: "text-orange-500",
    barColor: "bg-orange-500",
    iconBg: "bg-orange-50 text-orange-500",
  },
  InProgressRequest: {
    colorClass: "text-pink-500",
    barColor: "bg-pink-500",
    iconBg: "bg-pink-50 text-pink-500",
  },
};
 
export default function ContributorDashboard() {
  const { user, menu, token } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardCards, setDashboardCards] = useState<
    { columnName: string; value: string }[]
  >([]);
 
  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      try {
        const res = await axios.post(
          API_ENDPOINTS.ContributorDash,
          {
            Contributor: user?.CompanyName || "",
          },
          {
            headers: 
            getAPI_HEADER(),
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            
          }
        );
        const apiData = res.data?.data || [];
        // Normalize data to array of {columnName, value}
        setDashboardCards(
          apiData.map((item: any) => ({
            columnName: item.ColumnName,
            value: item.Value,
          }))
        );
      } catch (error) {
        setDashboardCards([]);
      } finally {
        setLoading(false);
      }
    };
 
    if (user?.CompanyName) {
      fetchDashboard();
    } else {
      setLoading(false);
    }
  }, [user?.CompanyName, token]);
 
  const handleCardClick = (columnName: string, index: number) => {
    const colLower = (columnName || "").toLowerCase();
 
    // 1. First card (ContributorCount) -> Navigate to Add Employee
    if (index === 0 || colLower.includes("contributor") || colLower.includes("employee")) {
      const addEmpRoute = menu?.find((m) =>
        m.components?.toLowerCase().includes("addemployee") ||
        m.Route?.toLowerCase().includes("addemployee")
      )?.Route;
 
      if (addEmpRoute) {
        navigate(addEmpRoute);
      } else {
        const ut = (user?.Usertype || "").toLowerCase().trim().replace(/[\s_-]+/g, "");
        if (ut.includes("contributoruser")) {
          navigate("/ConUserAddEmployee");
        } else if (ut.includes("contributoradmin")) {
          navigate("/ConAdminAddEmployee");
        } else {
          navigate("/AddEmployee");
        }
      }
      return;
    }
 
    // 2. Request cards -> Navigate to Contributor Service Requests
    const srRoute = menu?.find((m) =>
      m.components?.toLowerCase().includes("contributorservicerequest") ||
      m.components?.toLowerCase().includes("servicerequest") ||
      m.Route?.toLowerCase().includes("servicerequest")
    )?.Route || "/ServiceRequest";
 
    navigate(srRoute);
  };
 
  return (
    <div className="w-full select-text animate-fade-in">
      {/* 1. Video Banner Section */}
      <div className="relative rounded-3xl overflow-hidden bg-[#031f30] text-white p-8 mb-8 shadow-sm flex flex-col items-end justify-between min-h-[220px]">
        {/* Background Video */}
        <div className="absolute inset-0 w-full h-full z-0 overflow-hidden pointer-events-none opacity-45">
          <video
            className="object-fill absolute inset-0 w-full h-full object-cover mix-blend-overlay"
            autoPlay
            muted
            loop
            playsInline
          >
            <source src={bgVideo} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-l from-[#031f30] via-[#031f30]/40 to-transparent z-10"></div>
        </div>
 
        {/* Banner Content */}
        <div className="relative z-10 max-w-xl mt-auto flex flex-col items-end">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#10B981] bg-emerald-950/60 border border-emerald-500/30 px-3 py-1 rounded-full mb-3 shadow-xs">
            CONTRIBUTOR WORKSPACE
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2 text-right">
            CONTRIBUTOR VERIFICATION PORTAL
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm text-right leading-relaxed mb-6">
            Review inbound candidate background verification requests, verify employment credentials, and manage service requests.
          </p>
        </div>
      </div>
 
      {/* 2. Dynamic Metric Cards Section */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {loading ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="relative bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden p-6 flex flex-col"
            >
              <div className="absolute top-0 left-0 right-0 h-[3.5px] bg-slate-200 animate-pulse" />
              <div className="flex justify-between items-start mb-3">
                <span className="h-4 bg-slate-100 rounded w-1/2 animate-pulse"></span>
                <span className="p-2 rounded-xl bg-slate-100 text-slate-200 animate-pulse">
                  <Folder className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-5">
                <span className="font-extrabold block text-3xl sm:text-3.5xl text-slate-200 animate-pulse">
                  --
                </span>
                <span className="text-slate-300 font-medium mt-1.5 block text-[12px] h-3 animate-pulse"></span>
              </div>
            </div>
          ))
        ) : dashboardCards.length === 0 ? (
          <div className="col-span-full text-center text-slate-400 py-8">
            No dashboard data available.
          </div>
        ) : (
          dashboardCards.map((card, idx) => {
            const {
              colorClass = "text-blue-500",
              barColor = "bg-blue-500",
              iconBg = "bg-blue-50 text-blue-500",
            } = columnColorMap[card.columnName] || {};
            const Icon = columnIconMap[card.columnName] || Folder;
            // Card Title: Show the columnName in a user-friendly way
            const title =
              card.columnName
                .replace(/([a-z])([A-Z])/g, "$1 $2")
                .replace(/^./, (str) => str.toUpperCase()) || card.columnName;
 
            return (
              <div
                key={card.columnName}
                onClick={() => handleCardClick(card.columnName, idx)}
                className="relative bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden p-6 flex flex-col transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-lg hover:border-slate-200/80 cursor-pointer select-none"
              >
                {/* Top Accent Color Bar */}
                <div className={`absolute top-0 left-0 right-0 h-[3.5px] ${barColor}`} />
 
                <div className="flex justify-between items-start mb-3">
                  <span className="font-bold text-slate-600 tracking-widest text-[12px]">
                    {title}
                  </span>
                  <div className={`p-2 rounded-xl ${iconBg}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
 
                <div className="mt-5">
                  <span className={`font-extrabold block text-3xl sm:text-3.5xl ${colorClass}`}>
                    {card.value}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
      <ContributorBarChart cards={dashboardCards} loading={loading} />
    </div>
  );
}
 
 