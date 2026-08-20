import { Button, Result } from 'antd';
import { useNavigate } from 'react-router';
import { HomeOutlined } from '@ant-design/icons';

/**
 * 404 Not Found page
 */
const NotFound: React.FC = () => {
  const navigate = useNavigate();

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
        status="404"
        title="404"
        subTitle="Sorry, the page you visited does not exist."
        extra={
          <Button
            type="primary"
            icon={<HomeOutlined />}
            onClick={() => navigate('/dashboard')}
            className="ldw-clickable"
          >
            Back to Dashboard
          </Button>
        }
      />
    </div>
  );
};

export default NotFound;
