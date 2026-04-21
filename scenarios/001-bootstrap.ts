import type { Scenario } from '@lab/scenario-core';
import { LintAdapter, TypecheckAdapter, ModuleSizeAdapter } from '@lab/adapters';
import type { ScenarioResult } from '@lab/shared';

export const scenario001: Scenario = {
  id: '001-bootstrap',
  title: 'Bootstrap',
  category: 'bootstrap',
  objective: 'the lab itself comes up clean: lint, typecheck, and module sizes are sane',
  fixture: null,
  expectedCommand: 'pnpm verify',
  expectedResult: { status: 'pass' },
  minimumEvidence: [
    { kind: 'file', pathRelativeToRun: 'lint.stdout.txt', description: 'lint output' },
    { kind: 'file', pathRelativeToRun: 'typecheck.stdout.txt', description: 'typecheck output' },
    {
      kind: 'file',
      pathRelativeToRun: 'module-size.json',
      description: 'per-file size manifest'
    }
  ],
  async run(ctx): Promise<ScenarioResult> {
    const lint = new LintAdapter();
    const typecheck = new TypecheckAdapter();
    const moduleSize = new ModuleSizeAdapter({
      include: ['packages', 'apps'],
      maxLines: 300
    });

    const lintResult = await lint.run({ cwd: ctx.cwd, evidenceDir: ctx.evidenceDir });
    const typecheckResult = await typecheck.run({ cwd: ctx.cwd, evidenceDir: ctx.evidenceDir });
    const sizeResult = await moduleSize.run({ cwd: ctx.cwd, evidenceDir: ctx.evidenceDir });

    const allOk =
      lintResult.status === 'ok' && typecheckResult.status === 'ok' && sizeResult.status === 'ok';

    return {
      scenarioId: this.id,
      status: allOk ? 'pass' : 'fail',
      startedAt: '',
      finishedAt: '',
      durationMs: 0,
      metrics: {
        lint_exit_code: lintResult.metrics.exit_code ?? 0,
        typecheck_exit_code: typecheckResult.metrics.exit_code ?? 0,
        max_module_lines: sizeResult.metrics.max_module_lines ?? 0,
        oversized_files: sizeResult.metrics.oversized_files ?? 0
      },
      adapters: [lintResult, typecheckResult, sizeResult],
      evidencePaths: [ctx.evidenceDir],
      notes: allOk ? ['lab toolchain is healthy'] : ['toolchain found violations'],
      ...(allOk
        ? {}
        : {
            failureReason: [
              lintResult.status !== 'ok' ? 'lint failed' : '',
              typecheckResult.status !== 'ok' ? 'typecheck failed' : '',
              sizeResult.status !== 'ok'
                ? `${sizeResult.metrics.oversized_files} oversized files`
                : ''
            ]
              .filter(Boolean)
              .join('; ')
          })
    };
  }
};
