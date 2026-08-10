import type { ReactNode } from 'react';
import { Typography } from 'antd';
import './index.less';

interface PageContainerProps {
  title: string;
  extra?: ReactNode;
  children: ReactNode;
}

const { Title } = Typography;

const PageContainer: React.FC<PageContainerProps> = ({ title, extra, children }) => {
  return (
    <div className="page-container">
      <div className="page-header">
        <Title level={3} style={{ margin: 0 }}>
          {title}
        </Title>
        {extra && <div className="page-extra">{extra}</div>}
      </div>
      <div className="page-content">{children}</div>
    </div>
  );
};

export default PageContainer;
