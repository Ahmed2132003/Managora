import { useState } from "react";
import { Link } from "react-router-dom";
import { notifications } from "@mantine/notifications";

import { DashboardShell } from "../DashboardShell";
import {
  useDeleteEmployeeDocument,
  useMyEmployeeDocuments,
  useMyPayrollRuns,
  useUploadMyEmployeeDocument,
} from "../../shared/hr/hooks";
import { endpoints } from "../../shared/api/endpoints";
import "./EmployeeSelfServicePage.css";

type Language = "en" | "ar";

type Copy = Record<Language, {
  title: string;
  subtitle: string;
  helper: string;
  sections: { payroll: string; leaves: string; attendance: string; documents: string };
  actions: {
    requestLeave: string;
    viewAttendance: string;
    upload: string;
    uploading: string;
    delete: string;
    payslipPng: string;
    payslipPdf: string;
  };
  labels: {
    status: string;
    net: string;
    emptyPayroll: string;
    emptyDocuments: string;
    docType: string;
    docTitle: string;
    file: string;
  };
  notifications: { uploadSuccess: string; uploadError: string; deleteSuccess: string; deleteError: string };
}>;

const pageCopy: Copy = {
  en: {
    title: "Employee Self Service",
    subtitle: "Manage payroll, leaves, documents, and attendance in one place.",
    helper: "For all employees",
    sections: { payroll: "My Salary", leaves: "Leave Request", attendance: "Attendance", documents: "My Documents" },
    actions: {
      requestLeave: "Create Leave Request",
      viewAttendance: "View My Attendance",
      upload: "Upload Document",
      uploading: "Uploading...",
      delete: "Delete",
      payslipPng: "Payslip PNG",
      payslipPdf: "Payslip PDF",
    },
    labels: {
      status: "Status",
      net: "Net Salary",
      emptyPayroll: "No payroll runs yet.",
      emptyDocuments: "No uploaded documents yet.",
      docType: "Document Type",
      docTitle: "Title",
      file: "File",
    },
    notifications: {
      uploadSuccess: "Document uploaded successfully.",
      uploadError: "Failed to upload document.",
      deleteSuccess: "Document deleted.",
      deleteError: "Failed to delete document.",
    },
  },
  ar: {
    title: "بوابة الخدمات الذاتية للموظف",
    subtitle: "تابع الراتب والإجازات والمستندات والحضور من مكان واحد.",
    helper: "متاحة لجميع الموظفين",
    sections: { payroll: "راتبي", leaves: "طلب إجازة", attendance: "الحضور", documents: "مستنداتي" },
    actions: {
      requestLeave: "إنشاء طلب إجازة",
      viewAttendance: "عرض حضوري",
      upload: "رفع مستند",
      uploading: "جاري الرفع...",
      delete: "حذف",
      payslipPng: "قسيمة PNG",
      payslipPdf: "قسيمة PDF",
    },
    labels: {
      status: "الحالة",
      net: "صافي الراتب",
      emptyPayroll: "لا توجد مسيرات رواتب حتى الآن.",
      emptyDocuments: "لا توجد مستندات مرفوعة.",
      docType: "نوع المستند",
      docTitle: "العنوان",
      file: "الملف",
    },
    notifications: {
      uploadSuccess: "تم رفع المستند بنجاح.",
      uploadError: "فشل رفع المستند.",
      deleteSuccess: "تم حذف المستند.",
      deleteError: "فشل حذف المستند.",
    },
  },
};

export function EmployeeSelfServicePage() {
  const runsQuery = useMyPayrollRuns();
  const docsQuery = useMyEmployeeDocuments();
  const uploadMutation = useUploadMyEmployeeDocument();
  const deleteMutation = useDeleteEmployeeDocument();

  const [docType, setDocType] = useState("other");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);

  async function handleUpload(copy: Copy[Language]) {
    if (!file) return;
    try {
      await uploadMutation.mutateAsync({ doc_type: docType, title, file });
      setTitle("");
      setFile(null);
      await docsQuery.refetch();
      notifications.show({ color: "teal", message: copy.notifications.uploadSuccess });
    } catch {
      notifications.show({ color: "red", message: copy.notifications.uploadError });
    }
  }

  async function handleDelete(id: number, copy: Copy[Language]) {
    try {
      await deleteMutation.mutateAsync(id);
      await docsQuery.refetch();
      notifications.show({ color: "teal", message: copy.notifications.deleteSuccess });
    } catch {
      notifications.show({ color: "red", message: copy.notifications.deleteError });
    }
  }

  return (
    <DashboardShell
      copy={{
        en: { title: pageCopy.en.title, subtitle: pageCopy.en.subtitle, helper: pageCopy.en.helper },
        ar: { title: pageCopy.ar.title, subtitle: pageCopy.ar.subtitle, helper: pageCopy.ar.helper },
      }}
      className="employee-self-service"
    >
      {({ language, isArabic }) => {
        const copy = pageCopy[language];
        return (
          <div className="employee-self-service__content" dir={isArabic ? "rtl" : "ltr"}>
            <section className="panel">
              <div className="panel__header"><h2>{copy.sections.payroll}</h2></div>
              {runsQuery.data?.length ? runsQuery.data.map((run) => (
                <article key={run.id} className="employee-self-service__card">
                  <p><strong>{copy.labels.status}:</strong> {run.status}</p>
                  <p><strong>{copy.labels.net}:</strong> {run.net_total}</p>
                  <div className="employee-self-service__actions">
                    <a href={endpoints.hr.payrollRunPayslipPng(run.id)} target="_blank" rel="noreferrer">{copy.actions.payslipPng}</a>
                    <a href={endpoints.hr.payrollRunPayslipPdf(run.id)} target="_blank" rel="noreferrer">{copy.actions.payslipPdf}</a>
                  </div>
                </article>
              )) : <p className="helper-text">{copy.labels.emptyPayroll}</p>}
            </section>

            <section className="panel employee-self-service__shortcuts">
              <div className="panel__header"><h2>{copy.sections.leaves}</h2></div>
              <Link className="btn btn--primary" to="/leaves/request">{copy.actions.requestLeave}</Link>
              <div className="panel__header"><h2>{copy.sections.attendance}</h2></div>
              <Link className="btn btn--ghost" to="/attendance/self">{copy.actions.viewAttendance}</Link>
            </section>

            <section className="panel">
              <div className="panel__header"><h2>{copy.sections.documents}</h2></div>
              <div className="employee-self-service__upload">
                <input value={docType} onChange={(event) => setDocType(event.target.value)} placeholder={copy.labels.docType} />
                <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={copy.labels.docTitle} />
                <input type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
                <button className="btn btn--primary" type="button" disabled={!file || uploadMutation.isPending} onClick={() => handleUpload(copy)}>
                  {uploadMutation.isPending ? copy.actions.uploading : copy.actions.upload}
                </button>
              </div>
              {docsQuery.data?.length ? docsQuery.data.map((doc) => (
                <article key={doc.id} className="employee-self-service__card">
                  <p><strong>{copy.labels.docType}:</strong> {doc.doc_type}</p>
                  <p><strong>{copy.labels.docTitle}:</strong> {doc.title || "-"}</p>
                  <div className="employee-self-service__actions">
                    <a href={endpoints.hr.documentDownload(doc.id)} target="_blank" rel="noreferrer">{copy.labels.file}</a>
                    <button type="button" className="btn btn--ghost" onClick={() => handleDelete(doc.id, copy)}>{copy.actions.delete}</button>
                  </div>
                </article>
              )) : <p className="helper-text">{copy.labels.emptyDocuments}</p>}
            </section>
          </div>
        );
      }}
    </DashboardShell>
  );
}