import TestCase from '../../TestCase';
const React = window.React;

export default class CrossOriginFrameTestCase extends React.Component {
  state = {count: 0};

  componentDidMount() {
    this.interval = setInterval(() => {
      this.setState(state => ({count: state.count + 1}));
    }, 2000);
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  render() {
    return (
      <TestCase
        title="Selection within cross-origin iframes work"
        description=""
        affectedBrowsers="Safari"
        relatedIssues="14002">
        <TestCase.Steps>
          <li>Select text in the iframe below</li>
          <li>Open DevTools</li>
          <li>Wait for the counter to tick: {this.state.count}</li>
        </TestCase.Steps>
        <TestCase.ExpectedResult>
          No error is logged to the console.
        </TestCase.ExpectedResult>
        <iframe src="https://example.com/" />
      </TestCase>
    );
  }
}
