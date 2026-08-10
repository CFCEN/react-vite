import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router';
import { Form, Input, Button, Switch, App, Card, Space, Spin } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useEffect } from 'react';
import { applicationApi } from '@/api/applicationApi';
import type { CreateApplicationRequest, UpdateApplicationRequest, CommandDef } from '@/types/application';
import PageContainer from '@/components/PageContainer';

const { TextArea } = Input;

const ApplicationForm = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { message } = App.useApp();
  const [form] = Form.useForm<CreateApplicationRequest>();
  const isEdit = !!id;

  // 编辑模式：加载现有数据
  const { data: existingData, isLoading: loadingData } = useQuery({
    queryKey: ['application', id],
    queryFn: () => applicationApi.getById(Number(id)),
    enabled: isEdit,
  });

  // 编辑模式：数据就绪后回填表单
  useEffect(() => {
    if (existingData?.data) {
      const app = existingData.data;
      form.setFieldsValue({
        name: app.name,
        commands: app.commands.length > 0 ? app.commands : [{ name: 'default', command: '' }],
        description: app.description || '',
        workingDirectory: app.workingDirectory || '',
        environment: app.environment || '',
        autoStart: app.autoStart,
      });
    }
  }, [existingData, form]);

  const createMutation = useMutation({
    mutationFn: (data: CreateApplicationRequest) => applicationApi.create(data),
    onSuccess: () => {
      message.success('创建成功');
      navigate('/applications');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateApplicationRequest) => applicationApi.update(Number(id), data),
    onSuccess: () => {
      message.success('修改成功');
      navigate(`/applications/${id}`);
    },
  });

  const saving = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = () => {
    form.validateFields().then((values: CreateApplicationRequest) => {
      if (isEdit) {
        updateMutation.mutate(values as UpdateApplicationRequest);
      } else {
        createMutation.mutate(values);
      }
    });
  };

  if (isEdit && loadingData) {
    return (
      <PageContainer title="Loading...">
        <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={isEdit ? 'Edit Application' : 'New Application'}
      extra={
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(isEdit ? `/applications/${id}` : '/applications')}
        >
          返回
        </Button>
      }
    >
      <Card style={{ maxWidth: 700 }}>
        <Form
          form={form}
          layout="vertical"
          initialValues={{ autoStart: false, commands: [{ name: 'default', command: '' }] }}
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: '请输入应用名称' }]}
          >
            <Input placeholder="e.g. Aisee Frontend" />
          </Form.Item>

          {/* 多命令编辑器 */}
          <Form.Item label="Commands" required>
            <Form.List
              name="commands"
              rules={[
                {
                  validator: async (_, value: CommandDef[]) => {
                    if (!value || value.length === 0) {
                      return Promise.reject(new Error('至少需要一个命令'));
                    }
                    for (const cmd of value) {
                      if (!cmd.name?.trim()) {
                        return Promise.reject(new Error('命令名称不能为空'));
                      }
                      if (!cmd.command?.trim()) {
                        return Promise.reject(new Error('命令内容不能为空'));
                      }
                    }
                  },
                },
              ]}
            >
              {(fields, { add, remove }, { errors }) => (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    padding: 12,
                    background: '#fafafa',
                    borderRadius: 6,
                    border: '1px dashed #d9d9d9',
                  }}
                >
                  {fields.map(({ key, name, ...rest }) => (
                    <Space key={key} style={{ display: 'flex', alignItems: 'flex-start' }} size={8}>
                      <Form.Item
                        {...rest}
                        name={[name, 'name']}
                        style={{ marginBottom: 0, width: 120 }}
                        rules={[{ required: true, message: '名称' }]}
                      >
                        <Input placeholder="名称 (e.g. dev)" size="small" />
                      </Form.Item>
                      <Form.Item
                        {...rest}
                        name={[name, 'command']}
                        style={{ marginBottom: 0, flex: 1 }}
                        rules={[{ required: true, message: '请输入命令' }]}
                      >
                        <Input placeholder="命令 (e.g. pnpm dev)" size="small" />
                      </Form.Item>
                      {fields.length > 1 && (
                        <Button
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => remove(name)}
                          style={{ flexShrink: 0 }}
                        />
                      )}
                    </Space>
                  ))}
                  <Button
                    type="dashed"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => add({ name: '', command: '' })}
                    block
                  >
                    添加命令
                  </Button>
                  <Form.ErrorList errors={errors} />
                </div>
              )}
            </Form.List>
          </Form.Item>

          <Form.Item name="description" label="Description">
            <TextArea rows={2} placeholder="可选描述" />
          </Form.Item>

          <Form.Item
            name="workingDirectory"
            label="Working Directory"
            help="命令执行的工作目录，支持 ~/ 和绝对路径"
          >
            <Input placeholder="e.g. ~/project/aisee" />
          </Form.Item>

          <Form.Item
            name="environment"
            label="Environment Variables"
            help='JSON 字符串，例如: {"NODE_ENV":"development","PORT":"3000"}'
          >
            <Input placeholder='{"NODE_ENV":"development"}' />
          </Form.Item>

          <Form.Item
            name="autoStart"
            label="Auto Start"
            valuePropName="checked"
            help="是否随后端服务自动启动"
          >
            <Switch />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSubmit}
              loading={saving}
            >
              {isEdit ? '保存修改' : '创建应用'}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </PageContainer>
  );
};

export default ApplicationForm;
