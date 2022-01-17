import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Chatbox from './chatbox';

const ChatboxWithSettings = ({ settingsEndpoint = null, matrixServerUrl, ...rest }) => {
  const [settings, setSettings] = useState({});
  const [shifts, setShifts] = useState();
  const [isAvailable, setAvailability] = useState(true);

  const getSettings = async () => {
    const url = `${settingsEndpoint}?homeserver=${encodeURIComponent(matrixServerUrl)}`;
    const res = await fetch(url);
    const data = await res.json();
    const { fields, schedule = [] } = data;

    if (!fields) {
      const props = {
        ...rest,
        enabled: true,
        isAvailable: true,
      };

      return setSettings(props);
    }

    const settingsObj = {};

    setShifts(schedule);

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

  const checkSchedule = () => {
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const now = new Date();
    const weekday = weekdays[now.getDay()];
    const hours = now.getHours();
    const minutes = now.getMinutes();

    shifts.map(async (shift) => {
      const [startHours, startMinutes] = shift.start.split(':').map((t) => Number(t));
      const [endHours, endMinutes] = shift.end.split(':').map((t) => Number(t));
      if (
        shift.service === 'web'
        && shift.weekday === weekday
        && ((startHours < hours) || (startHours === hours && startMinutes <= minutes))
        && ((endHours > hours) || (endHours === hours && endMinutes > minutes))
      ) {
        setAvailability(true);
      }
    });
  };

  useEffect(() => {
    if (settingsEndpoint) {
      getSettings();
    }
  }, [settingsEndpoint]);

  useEffect(() => {
    if (shifts && shifts.length > 0) {
      checkSchedule();
    }
  }, [shifts]);

  return (
    /* eslint-disable react/jsx-props-no-spreading */
    <Chatbox matrixServerUrl={matrixServerUrl} isAvailable={isAvailable} {...settings} {...rest} />
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
