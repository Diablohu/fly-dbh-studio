import { StrictMode, useEffect } from 'react';
import { extend } from 'koot';
// import os from 'node:os';
import classNames from 'classnames';
// import storage from 'electron-json-storage';

import '@fontsource/inter';

import { StyledEngineProvider, CssVarsProvider } from '@mui/joy/styles';
import CssBaseline from '@mui/joy/CssBaseline';
import Box from '@mui/joy/Box';

import Nav from '@components/nav';

// ============================================================================

const App = extend()(({ className, children, location, ...props }) => {
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
            <StyledEngineProvider injectFirst>
                <CssVarsProvider defaultMode="system" disableTransitionOnChange>
                    {/* must be used under CssVarsProvider */}
                    <CssBaseline />

                    <Box
                        className={classNames([
                            className,
                            {
                                'is-home':
                                    location.pathname === '' ||
                                    location.pathname === '/',
                            },
                        ])}
                        sx={{
                            height: '100dvh',
                            position: 'relative',
                        }}
                    >
                        123
                    </Box>
                    {/* <div
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
                    </div> */}
                </CssVarsProvider>
            </StyledEngineProvider>
        </StrictMode>
    );
});
export default App;

// ============================================================================

const Main = (props) => <main {...props} />;
