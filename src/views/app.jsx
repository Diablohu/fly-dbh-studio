import { StrictMode, useEffect } from 'react';
import { extend } from 'koot';
// import os from 'node:os';
import classNames from 'classnames';
// import storage from 'electron-json-storage';

import { CssVarsProvider } from '@mui/joy/styles';
import CssBaseline from '@mui/joy/CssBaseline';
import '@fontsource/inter';

import Nav from '@components/nav';

import styles from './app.module.less';

// ============================================================================

const App = extend({
    styles,
})(({ className, children, location, ...props }) => {
    // storage.setDataPath(os.tmpdir());
    useEffect(() => {
        async function fetchData() {
            console.log(await window.electronStorage.getDataPath());
            console.log(await window.electronStorage.getAll());
        }
        fetchData();
    }, []);
    return (
        <StrictMode>
            <CssVarsProvider>
                {/* must be used under CssVarsProvider */}
                <CssBaseline />

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
            </CssVarsProvider>
        </StrictMode>
    );
});
export default App;

// ============================================================================

const Main = (props) => <main {...props} />;
