import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Chatbox from './chatbox';


const ChatboxWithSettings = ({ settingsEndpoint, matrixServerUrl, ...rest }) => {
  const [settings, setSettings] = useState({});
  const settingsObj = {};

  const getSettings = async () => {
    if (!settingsEndpoint) {
      const props = {
        ...rest,
        enabled: true,
      };

      return setSettings(props);
    }

    const url = `${settingsEndpoint}?homeserver=${encodeURIComponent(matrixServerUrl)}`;
    const res = await fetch(url);
    const data = await res.json();
    const { fields } = data;

    Object.entries(fields).forEach(([k, v]) => {
      const [scope, key] = k.split('_');

      if (scope === 'web') {
        settingsObj[key] = v;
      }
    });

    if (!settingsObj.enabled) {
      settingsObj.enabled = false;
    }

    return setSettings(settingsObj);
  };

  useEffect(() => {
    getSettings();
  }, []);

  return (
    <Chatbox matrixServerUrl={matrixServerUrl} {...settings} {...rest} />
  );
};

ChatboxWithSettings.propTypes = {
  matrixServerUrl: PropTypes.string.isRequired,
  settingsEndpoint: PropTypes.string,
};

ChatboxWithSettings.defaultProps = {
  settingsEndpoint: null,
};

export default ChatboxWithSettings;
