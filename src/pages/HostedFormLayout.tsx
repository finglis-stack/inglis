import { Outlet } from 'react-router-dom';

/**
 * This layout provides a completely clean slate for pages that are meant to be embedded in an iframe.
 * It removes all surrounding application chrome (headers, footers, etc.) and provides a transparent background.
 */
const HostedFormLayout = () => {
  return (
    <div className="bg-transparent p-4">
      <Outlet />
    </div>
  );
};

export default HostedFormLayout;