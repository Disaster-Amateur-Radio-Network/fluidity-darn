SET NSSMDIR=C:\Users\admin\nssm-2.24\win64
SET "CURDIR=%cd%"
cd %NSSMDIR%

nssm start FluidityAgentService

cd %CURDIR%