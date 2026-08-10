import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router';
import { Form, Input, Button, Switch, App, Space } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { applicationApi } from '@/api/applicationApi';
import { ApiRequestError } from '@/api/client';
import type {
  CreateApplicationRequest,
  UpdateApplicationRequest,
  CommandDef,
} from '@/types/application';
import { PageContainer } from '@/components';
import './index.less';

const { TextArea } = Input;

function isAbsoluteOrHomePath(value: string): boolean {
  const v = value.trim();
  return v.startsWith('/') || v.startsWith('~/');
}

function validateEnvironmentJson(_: unknown, value: string | undefined) {
  if (value == null || value.trim() === '') {
    return Promise.resolve();
  }
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return Promise.reject(new Error('Must be a JSON object, e.g. {"KEY":"value"}'));
    }
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof k !== 'string' || !k.trim()) {
        return Promise.reject(new Error('Environment keys must be non-empty strings'));
      }
      if (typeof v !== 'string' && typeof v !== 'number' && typeof v !== 'boolean') {
        return Promise.reject(new Error(`Value for "${k}" must be a string, number, or boolean`));
      }
    }
    return Promise.resolve();
  } catch {
    return Promise.reject(new Error('Invalid JSON — use an object like {"NODE_ENV":"development"}'));
  }
}

function validateWorkingDirectory(_: unknown, value: string | undefined) {
  if (value == null || value.trim() === '') {
    return Promise.resolve();
  }
  if (!isAbsoluteOrHomePath(value)) {
    return Promise.reject(new Error('Path must be absolute (/…) or start with ~/'));
  }
  return Promise.resolve();
}

type FormFieldName =
  | 'name'
  | 'description'
  | 'commands'
  | 'workingDirectory'
  | 'environment'
  | 'autoStart';

function mapSubmitErrorToFields(
  err: unknown,
): { name: FormFieldName; errors: string[] }[] {
  if (!(err instanceof ApiRequestError)) {
    return [{ name: 'name', errors: ['Submit failed. Please try again.'] }];
  }
  const msg = err.message || 'Submit failed';
  const lower = msg.toLowerCase();
  if (lower.includes('environment') || lower.includes('json')) {
    return [{ name: 'environment', errors: [msg] }];
  }
  if (lower.includes('directory') || lower.includes('path') || lower.includes('workdir')) {
    return [{ name: 'workingDirectory', errors: [msg] }];
  }
  if (lower.includes('command')) {
    return [{ name: 'commands', errors: [msg] }];
  }
  if (lower.includes('name') || lower.includes('exist') || lower.includes('duplicate')) {
    return [{ name: 'name', errors: [msg] }];
  }
  return [{ name: 'name', errors: [msg] }];
}

const ApplicationForm = () => {
  const navigate = useNavigate();
  const { id: idParam } = useParams<{ id: string }>();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<CreateApplicationRequest>();
  const isEdit = !!idParam;
  const id = Number(idParam);
  const idValid = !isEdit || (Number.isFinite(id) && id > 0);

  const existingQuery = useQuery({
    queryKey: ['application', id],
    queryFn: () => applicationApi.getById(id, { silent: true }),
    enabled: isEdit && idValid,
    retry: false,
  });

  useEffect(() => {
    if (existingQuery.data?.data) {
      const app = existingQuery.data.data;
      form.setFieldsValue({
        name: app.name,
        commands: app.commands.length > 0 ? app.commands : [{ name: 'default', command: '' }],
        description: app.description || '',
        workingDirectory: app.workingDirectory || '',
        environment: app.environment || '',
        autoStart: app.autoStart,
      });
    }
  }, [existingQuery.data, form]);

  const createMutation = useMutation({
    mutationFn: (data: CreateApplicationRequest) => applicationApi.create(data),
    onSuccess: () => {
      message.success('Application created');
      void queryClient.invalidateQueries({ queryKey: ['applications'] });
      navigate('/applications');
    },
    onError: (err) => {
      form.setFields(mapSubmitErrorToFields(err));
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateApplicationRequest) => applicationApi.update(id, data),
    onSuccess: () => {
      message.success('Application updated');
      void queryClient.invalidateQueries({ queryKey: ['applications'] });
      void queryClient.invalidateQueries({ queryKey: ['application', id] });
      navigate(`/applications/${id}`);
    },
    onError: (err) => {
      form.setFields(mapSubmitErrorToFields(err));
    },
  });

  const saving = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (values: CreateApplicationRequest) => {
    if (saving) return;
    const payload: CreateApplicationRequest = {
      ...values,
      name: values.name.trim(),
      environment:
        values.environment && values.environment.trim()
          ? values.environment.trim()
          : '{}',
      workingDirectory: values.workingDirectory?.trim() || undefined,
      commands: (values.commands || []).map((c) => ({
        name: c.name.trim(),
        command: c.command.trim(),
      })),
    };
    if (isEdit) {
      updateMutation.mutate(payload as UpdateApplicationRequest);
    } else {
      createMutation.mutate(payload);
    }
  };

  if (isEdit && !idValid) {
    return (
      <PageContainer
        title="Not Found"
        error="Invalid application id"
        onRetry={() => navigate('/applications')}
      />
    );
  }

  if (isEdit && existingQuery.isError) {
    return (
      <PageContainer
        title="Edit Application"
        error={existingQuery.error}
        onRetry={() => void existingQuery.refetch()}
      />
    );
  }

  return (
    <PageContainer
      title={isEdit ? 'Edit Application' : 'New Application'}
      subTitle={isEdit ? `ID ${id}` : 'Define commands and working directory'}
      className="applications-page applications-form"
      loading={isEdit && existingQuery.isLoading}
      loadingVariant="detail"
      extra={
        <Button
          icon={<ArrowLeftOutlined />}
          className="ldw-clickable"
          onClick={() => navigate(isEdit ? `/applications/${id}` : '/applications')}
        >
          Back
        </Button>
      }
    >
      <div className="app-form-card">
        <Form
          form={form}
          layout="vertical"
          initialValues={{ autoStart: false, commands: [{ name: 'default', command: '' }] }}
          disabled={saving}
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[
              { required: true, message: 'Name is required' },
              { whitespace: true, message: 'Name is required' },
              { max: 100, message: 'Name must be at most 100 characters' },
            ]}
          >
            <Input placeholder="e.g. Aisee Frontend" maxLength={100} />
          </Form.Item>

          <Form.Item label="Commands" required>
            <Form.List
              name="commands"
              rules={[
                {
                  validator: async (_, value: CommandDef[]) => {
                    if (!value || value.length === 0) {
                      return Promise.reject(new Error('At least one command is required'));
                    }
                    const names = new Set<string>();
                    for (const cmd of value) {
                      if (!cmd?.name?.trim()) {
                        return Promise.reject(new Error('Each command needs a name'));
                      }
                      if (!cmd?.command?.trim()) {
                        return Promise.reject(new Error('Each command needs a shell command'));
                      }
                      const n = cmd.name.trim();
                      if (names.has(n)) {
                        return Promise.reject(new Error(`Duplicate command name “${n}”`));
                      }
                      names.add(n);
                    }
                  },
                },
              ]}
            >
              {(fields, { add, remove }, { errors }) => (
                <div className="app-commands-editor">
                  {fields.map(({ key, name, ...rest }) => (
                    <Space key={key} className="app-commands-editor__row" size={8} align="start">
                      <Form.Item
                        {...rest}
                        name={[name, 'name']}
                        className="app-commands-editor__name"
                        rules={[{ required: true, message: 'Required' }]}
                      >
                        <Input placeholder="Name (e.g. dev)" size="small" aria-label="Command name" />
                      </Form.Item>
                      <Form.Item
                        {...rest}
                        name={[name, 'command']}
                        className="app-commands-editor__command"
                        rules={[{ required: true, message: 'Required' }]}
                      >
                        <Input
                          placeholder="Command (e.g. pnpm dev)"
                          size="small"
                          aria-label="Shell command"
                        />
                      </Form.Item>
                      {fields.length > 1 ? (
                        <Button
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          className="ldw-clickable app-commands-editor__remove"
                          onClick={() => remove(name)}
                          aria-label="Remove command"
                          title="Remove command"
                        />
                      ) : null}
                    </Space>
                  ))}
                  <Button
                    type="dashed"
                    size="small"
                    icon={<PlusOutlined />}
                    className="ldw-clickable"
                    onClick={() => add({ name: '', command: '' })}
                    block
                  >
                    Add command
                  </Button>
                  <Form.ErrorList errors={errors} />
                </div>
              )}
            </Form.List>
          </Form.Item>

          <Form.Item name="description" label="Description">
            <TextArea rows={2} placeholder="Optional description" maxLength={500} showCount />
          </Form.Item>

          <Form.Item
            name="workingDirectory"
            label="Working Directory"
            rules={[{ validator: validateWorkingDirectory }]}
            extra="Absolute path or ~/… — used as the process cwd"
          >
            <Input placeholder="e.g. ~/project/aisee" />
          </Form.Item>

          <Form.Item
            name="environment"
            label="Environment Variables"
            rules={[{ validator: validateEnvironmentJson }]}
            extra='JSON object, e.g. {"NODE_ENV":"development","PORT":"3000"}'
          >
            <Input.TextArea
              rows={3}
              placeholder='{"NODE_ENV":"development"}'
              className="app-env-input"
            />
          </Form.Item>

          <Form.Item
            name="autoStart"
            label="Auto Start"
            valuePropName="checked"
            extra="Start automatically when the backend boots"
          >
            <Switch />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={saving}
              disabled={saving}
              className="ldw-clickable"
            >
              {isEdit ? 'Save changes' : 'Create application'}
            </Button>
          </Form.Item>
        </Form>
      </div>
    </PageContainer>
  );
};

export default ApplicationForm;
