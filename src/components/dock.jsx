import React, { Fragment } from "react"
import PropTypes from "prop-types"

const Dock = ({ handleToggleOpen, size, label }) => {
  return(
    <button
      type="button"
      className="dock"
      onClick={handleToggleOpen}
      onKeyPress={handleToggleOpen}
      aria-labelledby="open-chatbox-label"
    >
      {
        size === 'small' ?
          <div id="open-chatbox-label">
            <span>{label}</span><span className="icon">+</span>
          </div>
        :
        <Fragment>
          <div id="open-chatbox-label">{label}</div>
          <div className="label-icon">
            <div className={`btn-icon`} aria-label={`Open support chat window`}>+</div>
          </div>
        </Fragment>
      }
    </button>
  )
}

export default Dock;