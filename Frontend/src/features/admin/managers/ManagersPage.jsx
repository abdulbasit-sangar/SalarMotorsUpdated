import { useState } from "react";
import { useTranslation } from "react-i18next";
import { formatDateTime as formatDate } from "../../../shared/utils/format.js";
import { useAsyncData } from "../../../shared/hooks/useAsyncData.js";
import {
  fetchManagers,
  activateManager,
  deactivateManager,
  deleteManager,
} from "../../../services/auth/authApi.js";
import { Badge } from "../../../shared/components/Badge.jsx";
import { Button } from "../../../shared/components/Button.jsx";
import { Skeleton } from "../../../shared/components/Skeleton.jsx";
import { ErrorState } from "../../../shared/components/ErrorState.jsx";
import { EmptyState } from "../../../shared/components/EmptyState.jsx";
import { useToast } from "../../../store/ui/ToastContext.jsx";
import { parseApiError } from "../../../services/api/client.js";

const ManagerRow = ({ manager, pending, onActivate, onDeactivate, onDelete }) => {
  const { t } = useTranslation("admin");
  const stamp = (value) =>
    value
      ? formatDate(value, { dateStyle: "medium", timeStyle: "short" })
      : t("managers.never");
  return (
  <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-card border border-card rounded-premium-lg p-4 shadow-card">
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <h3 className="font-display text-lg font-semibold text-card truncate">
          {manager.username}
        </h3>
        <Badge variant={manager.isActive ? "signal" : "danger"}>
          {manager.isActive ? t("managers.active") : t("managers.deactivated")}
        </Badge>
        <Badge variant={manager.emailVerified ? "neutral" : "danger"}>
          {manager.emailVerified
            ? t("managers.emailVerified")
            : t("managers.emailUnverified")}
        </Badge>
      </div>
      <p className="ltr-isolate text-ash text-xs mt-1 font-mono rtl:text-end">
        {manager.email}
      </p>
      <p className="text-ash text-xs mt-1">
        {t("managers.lastLogin", { date: stamp(manager.lastLogin) })} ·{" "}
        {t("managers.created", { date: stamp(manager.createdAt) })}
      </p>
    </div>

    <div className="flex flex-wrap gap-2 shrink-0">
      {manager.isActive ? (
        <Button
          size="sm"
          variant="danger"
          loading={pending === "deactivate"}
          onClick={() => onDeactivate(manager)}
        >
          {t("managers.deactivate")}
        </Button>
      ) : (
        <Button
          size="sm"
          variant="primary"
          loading={pending === "activate"}
          onClick={() => onActivate(manager)}
        >
          {t("managers.activate")}
        </Button>
      )}
      <Button
        size="sm"
        variant="secondary"
        loading={pending === "delete"}
        onClick={() => onDelete(manager)}
      >
        {t("managers.delete")}
      </Button>
    </div>
  </div>
  );
};

export default function ManagersPage() {
  const { t } = useTranslation("admin");
  const toast = useToast();
  const { data: managers, loading, error, refetch } = useAsyncData(fetchManagers, []);
  const [localManagers, setLocalManagers] = useState(null);
  const [pendingId, setPendingId] = useState(null);

  const list = localManagers ?? managers ?? [];

  const syncLocal = (updater) => {
    setLocalManagers((prev) => updater(prev ?? managers ?? []));
  };

  const handleActivate = async (manager) => {
    setPendingId({ id: manager._id, action: "activate" });
    try {
      const updated = await activateManager(manager._id);
      syncLocal((prev) =>
        prev.map((m) => (m._id === manager._id ? { ...m, ...updated } : m)),
      );
      toast.success(t("managers.activated"));
    } catch (err) {
      toast.error(parseApiError(err).message);
    } finally {
      setPendingId(null);
    }
  };

  const handleDeactivate = async (manager) => {
    const confirmed = window.confirm(
      t("managers.confirmDeactivate", { name: manager.username }),
    );
    if (!confirmed) return;

    setPendingId({ id: manager._id, action: "deactivate" });
    try {
      const updated = await deactivateManager(manager._id);
      syncLocal((prev) =>
        prev.map((m) => (m._id === manager._id ? { ...m, ...updated } : m)),
      );
      toast.success(t("managers.deactivatedToast"));
    } catch (err) {
      toast.error(parseApiError(err).message);
    } finally {
      setPendingId(null);
    }
  };

  const handleDelete = async (manager) => {
    const confirmed = window.confirm(
      t("managers.confirmDelete", { name: manager.username }),
    );
    if (!confirmed) return;

    setPendingId({ id: manager._id, action: "delete" });
    try {
      await deleteManager(manager._id);
      syncLocal((prev) => prev.filter((m) => m._id !== manager._id));
      toast.success(t("managers.deleted"));
    } catch (err) {
      toast.error(parseApiError(err).message);
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="container-page py-8 sm:py-10">
      <p className="font-mono text-xs text-brass uppercase tracking-widest mb-2">
        {t("managers.eyebrow")}
      </p>
      <h1 className="font-display text-4xl font-semibold text-bone mb-1">
        {t("managers.title")}
      </h1>
      <p className="text-ash text-sm mb-8">
        {t("managers.subtitle")}
      </p>

      {error ? (
        <ErrorState onRetry={refetch} />
      ) : loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : list.length ? (
        <div className="space-y-3">
          {list.map((manager) => (
            <ManagerRow
              key={manager._id}
              manager={manager}
              pending={pendingId?.id === manager._id ? pendingId.action : null}
              onActivate={handleActivate}
              onDeactivate={handleDeactivate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title={t("managers.emptyTitle")}
          description={t("managers.emptyDescription")}
        />
      )}
    </div>
  );
}
