SET NSSMDIR=C:\Users\admin\nssm-2.24\win64
cd %NSSMDIR%

nssm set FluidityAgentService Application C:\Users\admin\fluidity-darn\agent.bat
nssm set FluidityAgentService AppDirectory C:\Users\admin\fluidity-darn

nssm set FluidityAgentService DisplayName FluidityAgent
nssm set FluidityAgentService Description Fluidity Agent Service
nssm set FluidityAgentService Start SERVICE_AUTO_START

nssm set FluidityAgentService ObjectName LocalSystem

nssm set FluidityAgentService AppStopMethodSkip 0
nssm set FluidityAgentService AppStopMethodConsole 1500
nssm set FluidityAgentService AppStopMethodWindow 1500
nssm set FluidityAgentService AppStopMethodThreads 1500

nssm set FluidityAgentService AppThrottle 10000
nssm set FluidityAgentService AppExit Default Restart
nssm set FluidityAgentService AppRestartDelay 60000

md C:\Users\admin\fluidity-logs

nssm set FluidityAgentService AppStdout C:\Users\admin\fluidity-logs\out.log
nssm set FluidityAgentService AppStderr C:\Users\admin\fluidity-logs\error.log

nssm set FluidityAgentService AppStdoutCreationDisposition 4
nssm set FluidityAgentService AppStderrCreationDisposition 4
nssm set FluidityAgentService AppRotateFiles 1
nssm set FluidityAgentService AppRotateOnline 0
nssm set FluidityAgentService AppRotateSeconds 86400
nssm set FluidityAgentService AppRotateBytes 1048576
