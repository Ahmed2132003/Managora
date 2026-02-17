import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../shared/messaging/hooks";

type TopbarQuickActionsProps = {
  isArabic?: boolean;
};

export function TopbarQuickActions({ isArabic = false }: TopbarQuickActionsProps) {
  const navigate = useNavigate();
  const notificationsQuery = useNotifications();

  const unreadNotifications = useMemo(
    () => (notificationsQuery.data ?? []).filter((item) => !item.is_read).length,
    [notificationsQuery.data]
  );

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
      <button
        type="button"
        className="nav-item"
        style={{ position: "relative", margin: 0 }}
        onClick={() => navigate("/messages")}
        aria-label={isArabic ? "الرسائل والإشعارات" : "Messages and notifications"}
      >
        <span className="nav-icon" aria-hidden="true">
          🔔
        </span>
        {isArabic ? "الإشعارات" : "Notifications"}
        {unreadNotifications > 0 && (
          <span
            style={{
              marginInlineStart: "0.35rem",
              minWidth: "1.2rem",
              padding: "0.1rem 0.35rem",
              borderRadius: "999px",
              background: "#f43f5e",
              color: "#fff",
              fontSize: "0.75rem",
              fontWeight: 700,
              textAlign: "center",
            }}
          >
            {unreadNotifications}
          </span>
        )}
      </button>
      <button
        type="button"
        className="nav-item"
        style={{ margin: 0 }}
        onClick={() => navigate("/employee/self-service")}
        aria-label={isArabic ? "الخدمات الذاتية للموظف" : "Employee self service"}
      >
        <span className="nav-icon" aria-hidden="true">
          👤
        </span>
        {isArabic ? "البروفايل" : "Profile"}
      </button>
    </div>
  );
}