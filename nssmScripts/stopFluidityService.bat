SET NSSMDIR=C:\Users\admin\nssm-2.24\win64
SET "CURDIR=%cd%"
cd %NSSMDIR%

nssm status FluidityAgentService
nssm stop FluidityAgentService
nssm status FluidityAgentService

cd %CURDIR%
