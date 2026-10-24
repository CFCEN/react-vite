import { Button, Empty } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router';
import { PageContainer } from '@/components';
import { ClaudeAutomationSessionDetail } from './session-detail';
import './index.less';

export default function ClaudeAutomationDetailPage() {
  const { adapterId, sessionId } = useParams<{ adapterId: string; sessionId: string }>();
  const navigate = useNavigate();

  return (
    <PageContainer className="automation-detail-page" contentPadding={false}>
      {adapterId && sessionId ? (
        <ClaudeAutomationSessionDetail
          adapterId={adapterId}
          sessionId={sessionId}
          headerExtra={<Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/claude-automation')}>Back</Button>}
        />
      ) : <Empty description="Missing session id" />}
    </PageContainer>
  );
}
