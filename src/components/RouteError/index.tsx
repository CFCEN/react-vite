import { Button, Result, Typography } from 'antd';
import { useNavigate, useRouteError, isRouteErrorResponse } from 'react-router';
import { HomeOutlined, ReloadOutlined } from '@ant-design/icons';

/**
 * Global route ErrorBoundary fallback (react-router errorElement)
 */
const RouteError: React.FC = () => {
  const error = useRouteError();
  const navigate = useNavigate();

  let title = 'Unexpected Application Error';
  let detail = 'Something went wrong while rendering this page.';

  if (isRouteErrorResponse(error)) {
    title = `${error.status} ${error.statusText}`;
    detail = typeof error.data === 'string' ? error.data : detail;
  } else if (error instanceof Error) {
    detail = error.message;
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: 24,
      }}
    >
      <Result
        status="error"
        title={title}
        subTitle={
          <Typography.Paragraph type="secondary" style={{ maxWidth: 480 }}>
            {detail}
          </Typography.Paragraph>
        }
        extra={[
          <Button
            key="retry"
            type="primary"
            icon={<ReloadOutlined />}
            onClick={() => window.location.reload()}
            className="ldw-clickable"
          >
            Reload
          </Button>,
          <Button
            key="home"
            icon={<HomeOutlined />}
            onClick={() => navigate('/dashboard')}
            className="ldw-clickable"
          >
            Dashboard
          </Button>,
        ]}
      />
    </div>
  );
};

export default RouteError;
