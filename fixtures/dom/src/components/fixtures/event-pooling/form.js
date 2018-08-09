import TestCase from '../../TestCase';

const React = window.React;

class Form extends React.Component {
  state = {
    submits: 0,
    resets: 0,
  };

  handleSubmit = event => {
    event.preventDefault();
    this.setState(state => ({submits: state.submits + 1}));
  };

  handleReset = event => {
    event.preventDefault();
    this.setState(state => ({resets: state.resets + 1}));
  };

  render() {
    const {submits, resets} = this.state;

    const formStyle = {
      padding: '10px 20px',
      border: '1px solid #d9d9d9',
      margin: '10px 0 20px',
    };

    return (
      <TestCase title="Form" description="">
        <TestCase.Steps>
          <li>Click Submit</li>
          <li>Click Reset</li>
        </TestCase.Steps>

        <TestCase.ExpectedResult>
          The event count should increase by one for every click.
        </TestCase.ExpectedResult>

        <form style={formStyle} onSubmit={this.handleSubmit}>
          <p>onSubmit calls: {submits}</p>
          <input type="submit" />
        </form>

        <form style={formStyle} onReset={this.handleReset}>
          <p>onReset calls: {resets}</p>
          <input type="reset" />
        </form>
      </TestCase>
    );
  }
}

export default Form;
