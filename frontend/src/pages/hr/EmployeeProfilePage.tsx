import { useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Badge,
  Button,
  Card,
  FileInput,
  Group,
  Select,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { Controller, useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { env } from "../../shared/config/env.ts";
import { isForbiddenError } from "../../shared/api/errors.ts";
import {
  useCreateEmployee,
  useDepartments,
  useEmployee,
  useEmployeeDocuments,
  useEmployees,
  useJobTitles,
  useUpdateEmployee,
  useUploadEmployeeDocument,
  useDeleteEmployeeDocument,
  type EmployeeStatus,
} from "../../shared/hr/hooks.ts";
import { AccessDenied } from "../../shared/ui/AccessDenied.tsx";
import { endpoints } from "../../shared/api/endpoints.ts";

const employeeSchema = z.object({
  employee_code: z.string().min(1, "الكود مطلوب"),
  full_name: z.string().min(1, "الاسم مطلوب"),
  national_id: z.string().optional().or(z.literal("")),
  hire_date: z.string().min(1, "تاريخ التعيين مطلوب"),
  status: z.enum(["active", "inactive", "terminated"]),
  department_id: z.string().nullable().optional(),
  job_title_id: z.string().nullable().optional(),
  manager_id: z.string().nullable().optional(),
});

type EmployeeFormValues = z.input<typeof employeeSchema>;

const employeeDefaults: EmployeeFormValues = {
  employee_code: "",
  full_name: "",
  national_id: "",
  hire_date: "",
  status: "active",
  department_id: null,
  job_title_id: null,
  manager_id: null,
};

const documentSchema = z.object({
  doc_type: z.string().min(1, "نوع المستند مطلوب"),
  title: z.string().min(1, "العنوان مطلوب"),
  file: z
    .custom<File | null>()
    .refine((value) => value instanceof File, { message: "الملف مطلوب" }),
});

type DocumentFormValues = {
  doc_type: string;
  title: string;
  file: File | null;
};

const documentDefaults: DocumentFormValues = {
  doc_type: "",
  title: "",
  file: null,
};

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "terminated", label: "Terminated" },
];

export function EmployeeProfilePage() {
  const navigate = useNavigate();
  const params = useParams();
  const isNew = params.id === "new";
  const parsedId = !isNew && params.id ? Number(params.id) : null;
  const employeeId = parsedId && !Number.isNaN(parsedId) ? parsedId : null;

  const employeeQuery = useEmployee(employeeId);
  const departmentsQuery = useDepartments();
  const jobTitlesQuery = useJobTitles();
  const managersQuery = useEmployees({ search: "", page: 1, filters: {} });
  const documentsQuery = useEmployeeDocuments(employeeId);

  const createEmployeeMutation = useCreateEmployee();
  const updateEmployeeMutation = useUpdateEmployee();
  const uploadDocumentMutation = useUploadEmployeeDocument();
  const deleteDocumentMutation = useDeleteEmployeeDocument();

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: employeeDefaults,
  });

  const documentForm = useForm<DocumentFormValues>({
    resolver: zodResolver(documentSchema),
    defaultValues: documentDefaults,
  });

  useEffect(() => {
    if (employeeQuery.data && !isNew) {
      form.reset({
        employee_code: employeeQuery.data.employee_code,
        full_name: employeeQuery.data.full_name,
        national_id: employeeQuery.data.national_id ?? "",
        hire_date: employeeQuery.data.hire_date,
        status: employeeQuery.data.status,
        department_id: employeeQuery.data.department
          ? String(employeeQuery.data.department.id)
          : null,
        job_title_id: employeeQuery.data.job_title
          ? String(employeeQuery.data.job_title.id)
          : null,
        manager_id: employeeQuery.data.manager ? String(employeeQuery.data.manager.id) : null,
      });
    }
  }, [employeeQuery.data, form, isNew]);

  const departmentOptions = useMemo(
    () =>
      (departmentsQuery.data ?? []).map((dept) => ({
        value: String(dept.id),
        label: dept.name,
      })),
    [departmentsQuery.data]
  );

  const jobTitleOptions = useMemo(
    () =>
      (jobTitlesQuery.data ?? []).map((job) => ({
        value: String(job.id),
        label: job.name,
      })),
    [jobTitlesQuery.data]
  );

  const managerOptions = useMemo(
    () =>
      (managersQuery.data ?? [])
        .filter((manager) => manager.id !== employeeId)
        .map((manager) => ({
          value: String(manager.id),
          label: manager.full_name,
        })),
    [employeeId, managersQuery.data]
  );

  const showAccessDenied =
    isForbiddenError(employeeQuery.error) ||
    isForbiddenError(departmentsQuery.error) ||
    isForbiddenError(jobTitlesQuery.error) ||
    isForbiddenError(managersQuery.error) ||
    isForbiddenError(documentsQuery.error);

  if (showAccessDenied) {
    return <AccessDenied />;
  }

  async function handleSubmit(values: EmployeeFormValues) {
    const payload = {
      employee_code: values.employee_code,
      full_name: values.full_name,
      national_id: values.national_id || null,
      hire_date: values.hire_date,
      status: values.status as EmployeeStatus,
      department: values.department_id ? Number(values.department_id) : null,
      job_title: values.job_title_id ? Number(values.job_title_id) : null,
      manager: values.manager_id ? Number(values.manager_id) : null,
    };

    try {
      if (isNew) {
        const created = await createEmployeeMutation.mutateAsync(payload);
        notifications.show({
          title: "Employee created",
          message: "تم إنشاء الموظف بنجاح",
        });
        navigate(`/hr/employees/${created.id}`);
      } else if (employeeId) {
        await updateEmployeeMutation.mutateAsync({ id: employeeId, payload });
        notifications.show({
          title: "Employee updated",
          message: "تم تحديث بيانات الموظف",
        });
      }
    } catch (error) {
      notifications.show({
        title: "Save failed",
        message: String(error),
        color: "red",
      });
    }
  }

  async function handleDocumentSubmit(values: DocumentFormValues) {
    if (!employeeId) return;
    if (!values.file) {
      documentForm.setError("file", { message: "الملف مطلوب" });
      return;
    }
    try {
      await uploadDocumentMutation.mutateAsync({
        employeeId,
        doc_type: values.doc_type,
        title: values.title,
        file: values.file,        
      });
      notifications.show({
        title: "Document uploaded",
        message: "تم رفع المستند بنجاح",
      });
      documentForm.reset(documentDefaults);
      documentsQuery.refetch();
    } catch (error) {
      notifications.show({
        title: "Upload failed",
        message: String(error),
        color: "red",
      });
    }
  }

  async function handleDeleteDocument(documentId: number) {
    try {
      await deleteDocumentMutation.mutateAsync(documentId);
      notifications.show({
        title: "Document deleted",
        message: "تم حذف المستند",
      });
      documentsQuery.refetch();
    } catch (error) {
      notifications.show({
        title: "Delete failed",
        message: String(error),
        color: "red",
      });
    }
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={3}>{isNew ? "New Employee" : "Employee Profile"}</Title>
        {!isNew && employeeQuery.data && (
          <Badge color="blue">{employeeQuery.data.status}</Badge>
        )}
      </Group>

      <Card withBorder radius="md" p="md">
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <Tabs defaultValue="basic">
            <Tabs.List>
              <Tabs.Tab value="basic">Basic Info</Tabs.Tab>
              <Tabs.Tab value="job">Job</Tabs.Tab>
              <Tabs.Tab value="documents" disabled={isNew}>
                Documents
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="basic" pt="md">
              <Stack gap="md">
                <Controller
                  name="employee_code"
                  control={form.control}
                  render={({ field }) => (
                    <TextInput
                      label="Employee Code"
                      required
                      {...field}
                      error={form.formState.errors.employee_code?.message}
                    />
                  )}
                />
                <Controller
                  name="full_name"
                  control={form.control}
                  render={({ field }) => (
                    <TextInput
                      label="Full Name"
                      required
                      {...field}
                      error={form.formState.errors.full_name?.message}
                    />
                  )}
                />
                <Controller
                  name="national_id"
                  control={form.control}
                  render={({ field }) => (
                    <TextInput
                      label="National ID"
                      {...field}
                      error={form.formState.errors.national_id?.message}
                    />
                  )}
                />
                <Group grow>
                  <Controller
                    name="hire_date"
                    control={form.control}
                    render={({ field }) => (
                      <TextInput
                        label="Hire Date"
                        type="date"
                        required
                        {...field}
                        error={form.formState.errors.hire_date?.message}
                      />
                    )}
                  />
                  <Controller
                    name="status"
                    control={form.control}
                    render={({ field }) => (
                      <Select
                        label="Status"
                        data={statusOptions}
                        required
                        {...field}
                        error={form.formState.errors.status?.message}
                      />
                    )}
                  />
                </Group>
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="job" pt="md">
              <Stack gap="md">
                <Controller
                  name="department_id"
                  control={form.control}
                  render={({ field }) => (
                    <Select
                      label="Department"
                      data={departmentOptions}
                      searchable
                      clearable
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
                <Controller
                  name="job_title_id"
                  control={form.control}
                  render={({ field }) => (
                    <Select
                      label="Job Title"
                      data={jobTitleOptions}
                      searchable
                      clearable
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
                <Controller
                  name="manager_id"
                  control={form.control}
                  render={({ field }) => (
                    <Select
                      label="Manager"
                      data={managerOptions}
                      searchable
                      clearable
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="documents" pt="md">
              {!employeeId ? (
                <Text c="dimmed">احفظ الموظف أولاً لإضافة مستندات.</Text>
              ) : (
                <Stack gap="md">
                  <Card withBorder radius="md" p="md">
                    <Stack gap="sm">
                      <Controller
                        name="doc_type"
                        control={documentForm.control}
                        render={({ field }) => (
                          <TextInput
                            label="Document Type"
                            required
                            {...field}
                            error={documentForm.formState.errors.doc_type?.message}
                          />
                        )}
                      />
                      <Controller
                        name="title"
                        control={documentForm.control}
                        render={({ field }) => (
                          <TextInput
                            label="Title"
                            required
                            {...field}
                            error={documentForm.formState.errors.title?.message}
                          />
                        )}
                      />
                      <Controller
                        name="file"
                        control={documentForm.control}
                        render={({ field }) => (
                          <FileInput
                            label="File"
                            placeholder="Select file"
                            required
                            value={field.value}
                            onChange={field.onChange}
                            error={documentForm.formState.errors.file?.message}
                          />
                        )}
                      />
                      <Button
                        type="button"
                        loading={uploadDocumentMutation.isPending}
                        onClick={documentForm.handleSubmit(handleDocumentSubmit)}
                      >
                        Upload
                      </Button>
                    </Stack>
                  </Card>

                  <Card withBorder radius="md" p="md">
                    {documentsQuery.isLoading ? (
                      <Text c="dimmed">Loading documents...</Text>
                    ) : (
                      <Table striped highlightOnHover>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Title</Table.Th>
                            <Table.Th>Type</Table.Th>
                            <Table.Th>Uploaded</Table.Th>
                            <Table.Th>Actions</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {(documentsQuery.data ?? []).length === 0 ? (
                            <Table.Tr>
                              <Table.Td colSpan={4}>
                                <Text c="dimmed">لا توجد مستندات بعد.</Text>
                              </Table.Td>
                            </Table.Tr>
                          ) : (
                            (documentsQuery.data ?? []).map((doc) => (
                              <Table.Tr key={doc.id}>
                                <Table.Td>{doc.title}</Table.Td>
                                <Table.Td>{doc.doc_type}</Table.Td>
                                <Table.Td>
                                  {new Date(doc.created_at).toLocaleDateString()}
                                </Table.Td>
                                <Table.Td>
                                  <Group gap="xs">
                                    <Button
                                      size="xs"
                                      variant="light"
                                      component="a"
                                      href={`${env.API_BASE_URL}${endpoints.hr.documentDownload(doc.id)}`}
                                      target="_blank"
                                    >
                                      Download
                                    </Button>
                                    <Button
                                      size="xs"
                                      variant="light"
                                      color="red"
                                      onClick={() => handleDeleteDocument(doc.id)}
                                      loading={deleteDocumentMutation.isPending}
                                    >
                                      Delete
                                    </Button>
                                  </Group>
                                </Table.Td>
                              </Table.Tr>
                            ))
                          )}
                        </Table.Tbody>
                      </Table>
                    )}
                  </Card>
                </Stack>
              )}
            </Tabs.Panel>
          </Tabs>

          <Group mt="md">
            <Button type="submit" loading={createEmployeeMutation.isPending || updateEmployeeMutation.isPending}>
              Save
            </Button>
            <Button variant="subtle" onClick={() => navigate("/hr/employees")}>
              Back to list
            </Button>
          </Group>
        </form>
      </Card>
    </Stack>
  );
}