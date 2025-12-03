import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { spawn } from 'child_process';
import path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { weeks } = await request.json();

    // Fetch staff
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('*')
      .eq('user_id', userId);

    if (staffError) throw staffError;

    // Fetch shifts
    const { data: shifts, error: shiftsError } = await supabase
      .from('shifts')
      .select('*')
      .eq('user_id', userId);

    if (shiftsError) throw shiftsError;

    // Fetch rules
    const { data: rules, error: rulesError } = await supabase
      .from('rules')
      .select('*')
      .eq('user_id', userId);

    if (rulesError) throw rulesError;

    // Prepare data for Python scheduler
    const schedulerInput = {
      staff: staff.map(s => ({
        id: s.id,
        name: s.name,
        contracted_hours: s.contracted_hours || 0,
        max_hours: s.max_hours || 48,
        availability: s.availability || {}
      })),
      shifts: shifts.map(s => ({
        day: s.day,
        name: s.name,
        start_time: s.start_time,
        end_time: s.end_time
      })),
      rules: rules.map(r => ({
        type: r.type,
        name: r.name,
        enabled: r.enabled,
        value: r.value
      })),
      weeks: weeks || 1
    };

    // Call Python OR-Tools scheduler
    const result = await runPythonScheduler(schedulerInput);

    return NextResponse.json(result);

  } catch (error) {
    console.error('OR-Tools generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate rota' },
      { status: 500 }
    );
  }
}

function runPythonScheduler(input) {
  return new Promise((resolve, reject) => {
    const pythonPath = 'python'; // or 'python3' depending on your system
    const scriptPath = path.join(process.cwd(), 'python-scheduler', 'scheduler.py');

    const pythonProcess = spawn(pythonPath, [scriptPath]);

    let outputData = '';
    let errorData = '';

    // Send input data to Python script via stdin
    pythonProcess.stdin.write(JSON.stringify(input));
    pythonProcess.stdin.end();

    // Collect output
    pythonProcess.stdout.on('data', (data) => {
      outputData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python process exited with code ${code}: ${errorData}`));
        return;
      }

      try {
        const result = JSON.parse(outputData);
        resolve(result);
      } catch (e) {
        reject(new Error(`Failed to parse Python output: ${outputData}`));
      }
    });

    pythonProcess.on('error', (error) => {
      reject(new Error(`Failed to start Python process: ${error.message}`));
    });
  });
}