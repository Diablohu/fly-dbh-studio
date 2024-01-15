import { StrictMode, useEffect } from 'react';
import { extend } from 'koot';
// import os from 'node:os';
import classNames from 'classnames';
// import storage from 'electron-json-storage';

import '@fontsource/inter';

import Nav from '@components/nav';

import styles from './app.module.less';

// ============================================================================

const App = extend({
    styles,
})(({ className, children, location, ...props }) => {
    // storage.setDataPath(os.tmpdir());
    useEffect(async () => {
        console.log(await window.electronStorage.getDataPath());
        console.log(await window.electronStorage.getAll());
    }, []);
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
