import React from 'react';
import { Result, Button } from 'antd';
import { ToolOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const ModDashboardPage = () => {
  const navigate = useNavigate();

  return (
    <div className="flex h-full items-center justify-center bg-white">
      <Result
        icon={<ToolOutlined className="text-[#0aa679] text-7xl" />}
        title={<span className="text-2xl font-bold text-gray-800">Dashboard Tổng quan đang được phát triển</span>}
        subTitle={<span className="text-gray-500">Tính năng thống kê và báo cáo biểu đồ dành cho Moderator sẽ sớm ra mắt trong các phiên bản cập nhật tiếp theo.</span>}
        extra={[
          <Button 
            type="primary" 
            size="large"
            key="console" 
            style={{ backgroundColor: '#0aa679', borderColor: '#0aa679' }}
            onClick={() => navigate('/mod/verification')}
          >
            Đi tới Duyệt hồ sơ ngay
          </Button>
        ]}
      />
    </div>
  );
};

export default ModDashboardPage;