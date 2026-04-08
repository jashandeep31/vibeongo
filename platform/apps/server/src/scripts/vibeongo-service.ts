export const vibeongoServiceScript = `
[Unit]
Description= Vibeongo main binary for allowing the web access
After=graphical-session.target
PartOf=graphical-session.target

[Service]
Type=simple
ExecStart=%h/.local/bin/vibeongo serve 
Restart=on-failure
RestartSec=2

Environment=TERM=xterm-256color
Environment=COLORTERM=truecolor
Environment=PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/bin

[Install]
WantedBy=default.target
`;
