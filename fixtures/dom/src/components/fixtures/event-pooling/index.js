import FixtureSet from '../../FixtureSet';
import MouseMove from './mouse-move';
import Persistence from './persistence';
import Form from './form';

const React = window.React;

class EventPooling extends React.Component {
  render() {
    return (
      <FixtureSet title="Event Pooling" description="">
        <MouseMove />
        <Persistence />
        <Form />
      </FixtureSet>
    );
  }
}

export default EventPooling;
