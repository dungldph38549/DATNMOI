import { message } from "antd";

const DEFAULT_DURATION = 2;

const buildOptions = (content, duration = DEFAULT_DURATION) => ({
  content,
  duration,
});

export const notify = {
  success: (content, duration) => message.success(buildOptions(content, duration)),
  error: (content, duration) => message.error(buildOptions(content, duration)),
  info: (content, duration) => message.info(buildOptions(content, duration)),
  warning: (content, duration) => message.warning(buildOptions(content, duration)),
};

export default notify;
