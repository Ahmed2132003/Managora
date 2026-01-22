import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Card,
  Group,
  Stack,
  Switch,
  TextInput,
  Textarea,
  Title,
  NumberInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { Controller, useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { isForbiddenError } from "../../shared/api/errors";
import {
  useCreateCustomer,
  useCustomer,
  useUpdateCustomer,
  type CustomerPayload,
} from "../../shared/customers/hooks";
import { AccessDenied } from "../../shared/ui/AccessDenied";

const customerSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  credit_limit: z.number().min(0).nullable().optional(),
  payment_terms_days: z.number().min(0, "Payment terms must be 0 or more"),
  is_active: z.boolean(),
});

type CustomerFormValues = z.input<typeof customerSchema>;

const defaultValues: CustomerFormValues = {
  code: "",
  name: "",
  email: "",
  phone: "",
  address: "",
  credit_limit: null,
  payment_terms_days: 0,
  is_active: true,
};

export function CustomerFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const customerQuery = useCustomer(id);
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues,
  });

  useEffect(() => {
    if (!isEditing) {
      form.reset(defaultValues);
      return;
    }
    if (customerQuery.data) {
      form.reset({
        code: customerQuery.data.code,
        name: customerQuery.data.name,
        email: customerQuery.data.email ?? "",
        phone: customerQuery.data.phone ?? "",
        address: customerQuery.data.address ?? "",
        credit_limit: customerQuery.data.credit_limit
          ? Number(customerQuery.data.credit_limit)
          : null,
        payment_terms_days: customerQuery.data.payment_terms_days,
        is_active: customerQuery.data.is_active,
      });
    }
  }, [customerQuery.data, form, isEditing]);

  if (isForbiddenError(customerQuery.error)) {
    return <AccessDenied />;
  }

  async function handleSubmit(values: CustomerFormValues) {
    const payload: CustomerPayload = {
      code: values.code.trim(),
      name: values.name.trim(),
      email: values.email ? values.email.trim() : null,
      phone: values.phone ? values.phone.trim() : null,
      address: values.address ? values.address.trim() : null,
      credit_limit:
        typeof values.credit_limit === "number"
          ? values.credit_limit.toFixed(2)
          : null,
      payment_terms_days: values.payment_terms_days,
      is_active: values.is_active,
    };

    try {
      if (isEditing && id) {
        await updateMutation.mutateAsync({ id: Number(id), payload });
        notifications.show({ title: "Customer updated", message: "تم تحديث العميل" });
      } else {
        await createMutation.mutateAsync(payload);
        notifications.show({ title: "Customer created", message: "تم إنشاء العميل" });
      }
      navigate("/customers");
    } catch (error) {
      notifications.show({
        title: "Save failed",
        message: String(error),
        color: "red",
      });
    }
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={3}>{isEditing ? "Edit Customer" : "New Customer"}</Title>
        <Button variant="light" onClick={() => navigate("/customers")}>
          Back to Customers
        </Button>
      </Group>

      <Card withBorder radius="md" p="md">
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <Stack gap="md">
            <Group grow>
              <TextInput
                label="Code"
                placeholder="CUST-0001"
                required
                {...form.register("code")}
                error={form.formState.errors.code?.message}
              />
              <TextInput
                label="Name"
                placeholder="Customer name"
                required
                {...form.register("name")}
                error={form.formState.errors.name?.message}
              />
            </Group>

            <Group grow>
              <TextInput
                label="Email"
                placeholder="customer@email.com"
                {...form.register("email")}
                error={form.formState.errors.email?.message}
              />
              <TextInput
                label="Phone"
                placeholder="+20 1XX XXX XXXX"
                {...form.register("phone")}
                error={form.formState.errors.phone?.message}
              />
            </Group>

            <Textarea
              label="Address"
              placeholder="Customer address"
              minRows={2}
              {...form.register("address")}
              error={form.formState.errors.address?.message}
            />

            <Group grow>
              <Controller
                control={form.control}
                name="credit_limit"
                render={({ field }) => (
                  <NumberInput
                    label="Credit Limit"
                    value={field.value ?? ""}
                    onChange={(value) => {
                      field.onChange(typeof value === "number" ? value : null);
                    }}
                    min={0}
                    decimalScale={2}
                  />
                )}
              />
              <Controller
                control={form.control}
                name="payment_terms_days"
                render={({ field }) => (
                  <NumberInput
                    label="Payment terms (days)"
                    value={field.value}
                    onChange={(value) => {
                      field.onChange(typeof value === "number" ? value : 0);
                    }}
                    min={0}
                  />
                )}
              />
            </Group>

            <Controller
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <Switch
                  label="Active"
                  checked={field.value}
                  onChange={(event) => field.onChange(event.currentTarget.checked)}
                />
              )}
            />

            <Group justify="flex-end">
              <Button
                type="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                Save
              </Button>
            </Group>
          </Stack>
        </form>
      </Card>
    </Stack>
  );
}