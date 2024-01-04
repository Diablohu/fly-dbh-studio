import { StrictMode } from 'react';
import { extend } from 'koot';
import os from 'node:os';
import classNames from 'classnames';
import storage from 'electron-json-storage';

import Nav from '@components/nav';

import styles from './app.module.less';

// ============================================================================

const App = extend({
    styles,
})(({ className, children, location, ...props }) => {
    storage.setDataPath(os.tmpdir());
    storage.getAll((error, data) => {
        console.log(123, error, data);
    });
    return (
        <StrictMode>
            <div
                className={classNames([
                    className,
                    {
                        'is-home':
                            location.pathname === '' ||
                            location.pathname === '/',
                    },
                ])}
            >
                <Nav location={location} {...props} />
                <Main children={children} />
            </div>
        </StrictMode>
    );
});
export default App;

// ============================================================================

const Main = (props) => <main {...props} />;
