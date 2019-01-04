const Radio = require("prompt-radio");

/**
 * lets user select from a list of options
 * @param {object} radioOptions
 * @param {Function} callback
 */
function getRadioInput(radioOptions, callback) {
  const prompt = new Radio(radioOptions);
  return new Promise((resolve, reject) => {
    prompt.ask(answer => {
      if (answer === undefined) {
        //user pressed enter w/o selecting w/ space
        console.log(
          "\nErr: ".red +
            "Select an option with " +
            "space".green +
            ", confirm with " +
            "enter\n".green
        );
        getRadioInput(radioOptions, callback || resolve);
      } else {
        callback ? callback(answer) : resolve(answer);
      }
    });
  });
}

module.exports = {
  getRadioInput
};
