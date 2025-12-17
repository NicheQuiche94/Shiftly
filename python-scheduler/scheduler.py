#!/usr/bin/env python3

from ortools.sat.python import cp_model
import json
import sys


class ShiftlyScheduler:
    
    def __init__(self, data):
        self.staff = data['staff']
        self.shifts = data['shifts']
        self.rules = data['rules']
        self.weeks = data.get('weeks', 1)
        
        self.contract_issues = []
        self.all_solutions = []
        
    def solve_single_week(self, week_num, previous_solutions=None):
        model = cp_model.CpModel()
        solver = cp_model.CpSolver()
        
        schedule = {}
        for shift_idx in range(len(self.shifts)):
            schedule[shift_idx] = {}
            for staff_idx in range(len(self.staff)):
                var_name = f'sh{shift_idx}_st{staff_idx}'
                schedule[shift_idx][staff_idx] = model.NewBoolVar(var_name)
        
        # Each shift must have exactly the required number of staff
        for shift_idx in range(len(self.shifts)):
            staff_required = self.shifts[shift_idx].get('staff_required', 1)
            model.Add(sum(schedule[shift_idx][staff_idx] 
                         for staff_idx in range(len(self.staff))) == staff_required)
        
        # Hours constraints: must get AT LEAST contracted hours, up to max hours
        for staff_idx, staff in enumerate(self.staff):
            contracted_hours = staff.get('contracted_hours', 0)
            max_hours = staff.get('max_hours', contracted_hours) or contracted_hours
            
            if max_hours < contracted_hours:
                max_hours = contracted_hours
            
            total_minutes = sum(
                schedule[shift_idx][staff_idx] * 
                self._get_shift_duration(self.shifts[shift_idx])
                for shift_idx in range(len(self.shifts))
            )
            
            if contracted_hours > 0:
                model.Add(total_minutes >= (contracted_hours * 60) - 60)
            
            model.Add(total_minutes <= max_hours * 60)
        
        # Availability constraint (handles both old boolean and new AM/PM format)
        for shift_idx, shift in enumerate(self.shifts):
            shift_day = shift['day'].lower()
            shift_start = self._parse_time(shift['start_time'])
            is_morning = shift_start < 12 * 60  # Before noon = AM shift
            
            for staff_idx, staff in enumerate(self.staff):
                availability = staff.get('availability', {})
                day_availability = availability.get(shift_day, True)
                
                # Handle different availability formats
                if isinstance(day_availability, dict):
                    # New format: { 'AM': True, 'PM': False }
                    if is_morning:
                        is_available = day_availability.get('AM', True)
                    else:
                        is_available = day_availability.get('PM', True)
                elif isinstance(day_availability, bool):
                    # Old format: True/False for whole day
                    is_available = day_availability
                else:
                    # Default to available if format is unknown
                    is_available = True
                
                if not is_available:
                    model.Add(schedule[shift_idx][staff_idx] == 0)
        
        # ============================================================
        # HARD CONSTRAINT: Maximum 1 shift per staff per day
        # ============================================================
        shifts_by_day = {}
        for shift_idx, shift in enumerate(self.shifts):
            day = shift['day']
            if day not in shifts_by_day:
                shifts_by_day[day] = []
            shifts_by_day[day].append(shift_idx)
        
        for day, shift_indices_on_day in shifts_by_day.items():
            for staff_idx in range(len(self.staff)):
                model.Add(
                    sum(schedule[shift_idx][staff_idx] for shift_idx in shift_indices_on_day) <= 1
                )
        
        # Add optional rules
        self._add_rules_to_model(model, schedule)
        
        # Variety constraint for multi-week schedules
        if previous_solutions is not None and len(previous_solutions) > 0:
            for prev_solution in previous_solutions:
                differences = []
                for shift_idx in range(len(self.shifts)):
                    for staff_idx in range(len(self.staff)):
                        if prev_solution.get(shift_idx, {}).get(staff_idx, 0) == 1:
                            differences.append(1 - schedule[shift_idx][staff_idx])
                        else:
                            differences.append(schedule[shift_idx][staff_idx])
                
                min_changes = max(3, (len(self.shifts) * 9) // 10)
                model.Add(sum(differences) >= min_changes)
        
        solver.parameters.max_time_in_seconds = 30
        solver.parameters.num_search_workers = 8
        
        status = solver.Solve(model)
        
        if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
            solution = {}
            for shift_idx in range(len(self.shifts)):
                solution[shift_idx] = {}
                for staff_idx in range(len(self.staff)):
                    solution[shift_idx][staff_idx] = solver.Value(schedule[shift_idx][staff_idx])
            
            return {
                'success': True,
                'solution': solution,
                'stats': {
                    'wall_time': solver.WallTime(),
                    'branches': solver.NumBranches(),
                }
            }
        else:
            diagnostic = self._generate_solve_failure_diagnostic(week_num, previous_solutions)
            return {'success': False, 'error': diagnostic}
    
    def _generate_solve_failure_diagnostic(self, week_num, previous_solutions):
        total_contracted = sum(s.get('contracted_hours', 0) for s in self.staff)
        total_max_hours = sum(s.get('max_hours', s.get('contracted_hours', 0)) for s in self.staff)
        total_shift_hours = 0
        for shift in self.shifts:
            shift_hours = self._get_shift_duration(shift) / 60
            staff_required = shift.get('staff_required', 1)
            total_shift_hours += shift_hours * staff_required
        
        problems = []
        actions = []
        
        if total_max_hours < total_shift_hours - 2:
            shortage = total_shift_hours - total_max_hours
            problems.append(f"Your staff can work up to {total_max_hours:.0f}h (max) but shifts need {total_shift_hours:.0f}h")
            actions.append(f"Increase max hours for some staff, add more staff, or remove {int(shortage)}h of shifts")
        elif total_contracted > total_shift_hours + 2:
            surplus = total_contracted - total_shift_hours
            problems.append(f"Your staff need {total_contracted:.0f}h (contracted) but you only have {total_shift_hours:.0f}h of shifts")
            actions.append(f"Add {int(surplus)}+ hours of shifts, or reduce contracted hours by {int(surplus)}h total")
        
        for staff in self.staff:
            contracted = staff.get('contracted_hours', 0)
            max_hours = staff.get('max_hours', contracted) or contracted
            if contracted == 0:
                continue
            
            availability = staff.get('availability', {})
            available_days = []
            for day, avail in availability.items():
                if isinstance(avail, dict):
                    if avail.get('AM', False) or avail.get('PM', False):
                        available_days.append(day)
                elif avail:
                    available_days.append(day)
            
            max_possible = 0
            days_counted = set()
            for shift in self.shifts:
                shift_day = shift['day'].lower()
                if shift_day in [d.lower() for d in available_days]:
                    if shift['day'] not in days_counted:
                        max_possible += 8
                        days_counted.add(shift['day'])
            
            if max_possible < contracted - 2:
                problems.append(f"{staff['name']} needs {contracted}h but can only work {max_possible:.0f}h (available {len(available_days)} days)")
                if len(available_days) < 5:
                    actions.append(f"Increase {staff['name']}'s availability to more days")
                else:
                    actions.append(f"Reduce {staff['name']}'s contracted hours to {int(max_possible)}h or less")
        
        if previous_solutions and len(previous_solutions) >= 3:
            problems.append(f"Week {week_num} can't find enough variation from the previous {len(previous_solutions)} weeks")
            actions.append(f"Try generating fewer weeks at once (e.g., 1-2 weeks instead of {week_num})")
        
        shift_durations = set()
        for shift in self.shifts:
            duration = self._get_shift_duration_hours(shift['start_time'], shift['end_time'])
            shift_durations.add(duration)
        
        for staff in self.staff:
            contracted = staff.get('contracted_hours', 0)
            if contracted > 0:
                can_build = self._can_build_hours(contracted, sorted(shift_durations), max_shifts=7)
                if not can_build:
                    durations_list = ', '.join([f"{int(d) if d == int(d) else d}h" for d in sorted(shift_durations)])
                    problems.append(f"{staff['name']}'s {contracted}h contract can't be built from shift lengths: {durations_list}")
                    
                    possible_hours = []
                    for test_hours in range(contracted - 5, contracted + 6):
                        if test_hours > 0 and self._can_build_hours(test_hours, sorted(shift_durations), max_shifts=7):
                            possible_hours.append(test_hours)
                    
                    if possible_hours:
                        closest = min(possible_hours, key=lambda x: abs(x - contracted))
                        actions.append(f"Change {staff['name']}'s contract to {closest}h, or add different shift lengths (e.g., 5h or 9h shifts)")
        
        if problems:
            output = f"Cannot generate week {week_num}:\n\n"
            for i, problem in enumerate(problems, 1):
                output += f"{i}. {problem}\n"
            output += f"\nTo fix this:\n"
            for i, action in enumerate(actions, 1):
                output += f"- {action}\n"
            return output.strip()
        else:
            return f"Week {week_num} couldn't be generated. Try reducing the number of weeks or adjusting availability."
    
    def _add_rules_to_model(self, model, schedule):
        shifts_by_day = {}
        for shift_idx, shift in enumerate(self.shifts):
            day = shift['day']
            if day not in shifts_by_day:
                shifts_by_day[day] = []
            shifts_by_day[day].append(shift_idx)
        
        if self._rule_enabled('no_clopening'):
            day_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            for staff_idx in range(len(self.staff)):
                for day_idx in range(len(day_order) - 1):
                    current_day = day_order[day_idx]
                    next_day = day_order[day_idx + 1]
                    
                    closing_shifts = [
                        idx for idx, s in enumerate(self.shifts)
                        if s['day'] == current_day and self._is_closing_shift(s)
                    ]
                    opening_shifts = [
                        idx for idx, s in enumerate(self.shifts)
                        if s['day'] == next_day and self._is_opening_shift(s)
                    ]
                    
                    for closing_idx in closing_shifts:
                        for opening_idx in opening_shifts:
                            model.Add(
                                schedule[closing_idx][staff_idx] +
                                schedule[opening_idx][staff_idx] <= 1
                            )
        
        if self._rule_enabled('max_consecutive_days'):
            max_days = self._get_rule_value('max_consecutive_days', 6)
            day_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            
            for staff_idx in range(len(self.staff)):
                for start_day_idx in range(len(day_order) - max_days):
                    window_days = day_order[start_day_idx:start_day_idx + max_days + 1]
                    
                    days_worked_vars = []
                    for day in window_days:
                        day_shifts = [idx for idx, s in enumerate(self.shifts) if s['day'] == day]
                        if day_shifts:
                            day_worked = model.NewBoolVar(f'st{staff_idx}_{day}_worked')
                            model.AddMaxEquality(
                                day_worked,
                                [schedule[idx][staff_idx] for idx in day_shifts]
                            )
                            days_worked_vars.append(day_worked)
                    
                    if days_worked_vars:
                        model.Add(sum(days_worked_vars) <= max_days)
        
        if self._rule_enabled('fair_weekend_distribution'):
            weekend_days = ['Saturday', 'Sunday']
            weekend_shift_indices = [
                idx for idx, s in enumerate(self.shifts) if s['day'] in weekend_days
            ]
            
            if weekend_shift_indices:
                total_weekend_shifts = len(weekend_shift_indices)
                fair_share = total_weekend_shifts // len(self.staff)
                
                for staff_idx in range(len(self.staff)):
                    staff_weekend_shifts = sum(
                        schedule[idx][staff_idx] for idx in weekend_shift_indices
                    )
                    model.Add(staff_weekend_shifts >= max(0, fair_share - 1))
                    model.Add(staff_weekend_shifts <= fair_share + 2)
    
    def solve(self, timeout_seconds=60):
        results = []
        all_previous_solutions = []
        
        for week in range(self.weeks):
            print(f"Solving week {week + 1}...", file=sys.stderr)
            
            week_result = self.solve_single_week(week + 1, all_previous_solutions)
            
            if not week_result['success']:
                return {
                    'success': False,
                    'error': week_result['error'],
                }
            
            results.append(week_result)
            all_previous_solutions.append(week_result['solution'])
        
        schedule = self._format_schedule(results)
        self._check_contract_hours(schedule)
        
        rule_compliance = self._validate_rules(schedule)
        
        total_time = sum(r['stats']['wall_time'] for r in results)
        
        return {
            'success': True,
            'status': 'FEASIBLE',
            'schedule': schedule,
            'contract_issues': self.contract_issues,
            'rule_compliance': rule_compliance,
            'stats': {
                'wall_time': total_time,
                'branches': sum(r['stats']['branches'] for r in results),
            }
        }
    
    def _validate_rules(self, schedule):
        compliance = []
        
        double_shift_violations = self._check_no_double_shifts(schedule)
        if len(double_shift_violations) == 0:
            compliance.append({
                'rule': 'No Double Shifts',
                'status': 'followed',
                'details': 'No staff member works more than one shift per day.',
                'violations': []
            })
        else:
            compliance.append({
                'rule': 'No Double Shifts',
                'status': 'compromised',
                'details': f'Found {len(double_shift_violations)} double shift assignment(s).',
                'violations': double_shift_violations
            })
        
        if self._rule_enabled('rest_between_shifts'):
            min_hours = self._get_rule_value('rest_between_shifts', 12)
            rest_violations = self._check_overnight_rest(schedule, min_hours=min_hours)
            if len(rest_violations) == 0:
                compliance.append({
                    'rule': f'Overnight Rest ({min_hours}+ hours)',
                    'status': 'followed',
                    'details': f'All staff have at least {min_hours} hours rest between shifts on consecutive days.',
                    'violations': []
                })
            else:
                compliance.append({
                    'rule': f'Overnight Rest ({min_hours}+ hours)',
                    'status': 'compromised',
                    'details': f'Found {len(rest_violations)} case(s) of insufficient overnight rest.',
                    'violations': rest_violations
                })
        
        if self._rule_enabled('no_clopening'):
            violations = self._check_no_clopening(schedule)
            if len(violations) == 0:
                compliance.append({
                    'rule': 'No Clopening',
                    'status': 'followed',
                    'details': 'No staff member works a closing shift followed by an opening shift the next day.',
                    'violations': []
                })
            else:
                compliance.append({
                    'rule': 'No Clopening',
                    'status': 'compromised',
                    'details': f'Found {len(violations)} clopening occurrence(s).',
                    'violations': violations
                })
        
        if self._rule_enabled('fair_weekend_distribution'):
            weekend_patterns = self._check_fair_weekends(schedule)
            
            full_weekends_worked = {name: data['full_weekends_worked'] for name, data in weekend_patterns.items()}
            min_full_weekends = min(full_weekends_worked.values()) if full_weekends_worked else 0
            max_full_weekends = max(full_weekends_worked.values()) if full_weekends_worked else 0
            difference = max_full_weekends - min_full_weekends
            
            if difference <= 1:
                compliance.append({
                    'rule': 'Fair Weekend Distribution',
                    'status': 'followed',
                    'details': f'Weekend patterns are fairly distributed. Max difference in full weekends worked: {difference}.',
                    'violations': []
                })
            else:
                weekend_violations = []
                for staff_name, patterns in sorted(weekend_patterns.items(), key=lambda x: x[1]['full_weekends_worked'], reverse=True):
                    full_worked = patterns['full_weekends_worked']
                    partial = patterns['partial_weekends']
                    full_off = patterns['full_weekends_off']
                    
                    if full_worked > min_full_weekends + 1:
                        weekend_violations.append({
                            'staff': staff_name,
                            'day': 'Weekends',
                            'week': 'All weeks',
                            'issue': f'{full_worked} full weekend{"s" if full_worked != 1 else ""} worked, {partial} partial, {full_off} completely off',
                            'solution': f'Consider rotating full weekends more evenly - aim for {min_full_weekends}-{min_full_weekends + 1} full weekends per person'
                        })
                
                compliance.append({
                    'rule': 'Fair Weekend Distribution',
                    'status': 'compromised',
                    'details': f'Weekend distribution varies by {difference} full weekends. Some staff work more full weekends than others.',
                    'violations': weekend_violations
                })
        
        if self._rule_enabled('max_consecutive_days'):
            max_days = self._get_rule_value('max_consecutive_days', 6)
            violations = self._check_max_consecutive(schedule, max_days)
            
            if len(violations) == 0:
                compliance.append({
                    'rule': f'Maximum {max_days} Consecutive Days',
                    'status': 'followed',
                    'details': f'No staff member works more than {max_days} consecutive days.',
                    'violations': []
                })
            else:
                compliance.append({
                    'rule': f'Maximum {max_days} Consecutive Days',
                    'status': 'compromised',
                    'details': f'Found {len(violations)} case(s) of too many consecutive working days.',
                    'violations': violations
                })
        
        if self._rule_enabled('minimum_days_off'):
            min_days_off = self._get_rule_value('minimum_days_off', 2)
            days_off_violations = self._check_minimum_days_off(schedule, min_days_off=min_days_off)
            if len(days_off_violations) == 0:
                compliance.append({
                    'rule': f'Minimum {min_days_off} Days Off',
                    'status': 'followed',
                    'details': f'All staff have at least {min_days_off} days off per week.',
                    'violations': []
                })
            else:
                compliance.append({
                    'rule': f'Minimum {min_days_off} Days Off',
                    'status': 'compromised',
                    'details': f'Found {len(days_off_violations)} case(s) of insufficient days off.',
                    'violations': days_off_violations
                })
        
        return compliance
    
    def _check_no_double_shifts(self, schedule):
        violations = []
        
        for week_data in schedule:
            shifts_by_day_staff = {}
            
            for shift in week_data['shifts']:
                staff = shift['staff_name']
                day = shift['day']
                key = f"{staff}_{day}"
                
                if key not in shifts_by_day_staff:
                    shifts_by_day_staff[key] = []
                shifts_by_day_staff[key].append(shift)
            
            for key, shifts_list in shifts_by_day_staff.items():
                if len(shifts_list) > 1:
                    staff_name = shifts_list[0]['staff_name']
                    day = shifts_list[0]['day']
                    shift_names = [s['shift_name'] for s in shifts_list]
                    
                    violations.append({
                        'staff': staff_name,
                        'day': day,
                        'week': f"Week {week_data['week']}",
                        'issue': f"Assigned to {len(shifts_list)} shifts: {', '.join(shift_names)}",
                        'solution': f"Remove one shift or assign to different staff"
                    })
        
        return violations
    
    def _check_overnight_rest(self, schedule, min_hours=12):
        violations = []
        day_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        
        for week_data in schedule:
            staff_shifts = {}
            
            for shift in week_data['shifts']:
                staff = shift['staff_name']
                if staff not in staff_shifts:
                    staff_shifts[staff] = {}
                day = shift['day']
                if day not in staff_shifts[staff]:
                    staff_shifts[staff][day] = []
                staff_shifts[staff][day].append(shift)
            
            for staff, days_dict in staff_shifts.items():
                for day_idx in range(len(day_order) - 1):
                    current_day = day_order[day_idx]
                    next_day = day_order[day_idx + 1]
                    
                    if current_day not in days_dict or next_day not in days_dict:
                        continue
                    
                    current_shifts = days_dict[current_day]
                    next_shifts = days_dict[next_day]
                    
                    latest_end = max([self._parse_time(s['end_time']) for s in current_shifts])
                    if latest_end < 12 * 60:
                        latest_end += 1440
                    
                    earliest_start = min([self._parse_time(s['start_time']) for s in next_shifts])
                    earliest_start += 1440
                    
                    rest_minutes = earliest_start - latest_end
                    rest_hours = rest_minutes / 60
                    
                    if rest_hours < min_hours:
                        last_shift = max(current_shifts, key=lambda s: self._parse_time(s['end_time']))
                        first_shift = min(next_shifts, key=lambda s: self._parse_time(s['start_time']))
                        
                        violations.append({
                            'staff': staff,
                            'day': f"{current_day}-{next_day}",
                            'week': f"Week {week_data['week']}",
                            'issue': f"Only {rest_hours:.1f}h rest between {last_shift['shift_name']} and {first_shift['shift_name']}",
                            'solution': f"Swap {next_day}'s {first_shift['shift_name']} with another staff member"
                        })
        
        return violations
    
    def _check_no_clopening(self, schedule):
        violations = []
        day_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        
        for week_data in schedule:
            week_shifts_by_day = {}
            for shift in week_data['shifts']:
                day = shift['day']
                if day not in week_shifts_by_day:
                    week_shifts_by_day[day] = []
                week_shifts_by_day[day].append(shift)
            
            for day_idx in range(len(day_order) - 1):
                current_day = day_order[day_idx]
                next_day = day_order[day_idx + 1]
                
                current_shifts = week_shifts_by_day.get(current_day, [])
                next_shifts = week_shifts_by_day.get(next_day, [])
                
                closing_shifts = [s for s in current_shifts if self._is_closing_shift({'start_time': s['start_time'], 'end_time': s['end_time']})]
                opening_shifts = [s for s in next_shifts if self._is_opening_shift({'start_time': s['start_time']})]
                
                for closing in closing_shifts:
                    for opening in opening_shifts:
                        if closing['staff_name'] == opening['staff_name']:
                            violations.append({
                                'staff': closing['staff_name'],
                                'day': f"{current_day}-{next_day}",
                                'week': f"Week {week_data['week']}",
                                'issue': f"Closing shift ({closing['shift_name']}) followed by opening shift ({opening['shift_name']})",
                                'solution': f"Swap {next_day}'s {opening['shift_name']} with another staff member"
                            })
        
        return violations
    
    def _check_fair_weekends(self, schedule):
        staff_weekend_patterns = {}
        
        for staff in self.staff:
            staff_weekend_patterns[staff['name']] = {
                'full_weekends_worked': 0,
                'partial_weekends': 0,
                'full_weekends_off': 0,
                'total_shifts': 0
            }
        
        for week_data in schedule:
            staff_weekend_days = {}
            for shift in week_data['shifts']:
                if shift['day'] in ['Saturday', 'Sunday']:
                    staff = shift['staff_name']
                    if staff not in staff_weekend_days:
                        staff_weekend_days[staff] = set()
                    staff_weekend_days[staff].add(shift['day'])
                    staff_weekend_patterns[staff]['total_shifts'] += 1
            
            for staff in self.staff:
                staff_name = staff['name']
                days_worked = staff_weekend_days.get(staff_name, set())
                
                if len(days_worked) == 2:
                    staff_weekend_patterns[staff_name]['full_weekends_worked'] += 1
                elif len(days_worked) == 1:
                    staff_weekend_patterns[staff_name]['partial_weekends'] += 1
                else:
                    staff_weekend_patterns[staff_name]['full_weekends_off'] += 1
        
        return staff_weekend_patterns
    
    def _check_max_consecutive(self, schedule, max_days):
        violations = []
        day_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        
        for week_data in schedule:
            staff_worked_days = {}
            
            for shift in week_data['shifts']:
                staff = shift['staff_name']
                day = shift['day']
                if staff not in staff_worked_days:
                    staff_worked_days[staff] = set()
                staff_worked_days[staff].add(day)
            
            for staff, days_worked in staff_worked_days.items():
                consecutive = 0
                max_consecutive = 0
                consecutive_days = []
                
                for day in day_order:
                    if day in days_worked:
                        consecutive += 1
                        consecutive_days.append(day)
                        max_consecutive = max(max_consecutive, consecutive)
                    else:
                        if consecutive > max_days:
                            violations.append({
                                'staff': staff,
                                'day': f"{consecutive_days[0]}-{consecutive_days[-1]}",
                                'week': f"Week {week_data['week']}",
                                'issue': f"Worked {consecutive} consecutive days",
                                'solution': f"Add a day off during this period or reduce shift assignments"
                            })
                        consecutive = 0
                        consecutive_days = []
                
                if consecutive > max_days:
                    violations.append({
                        'staff': staff,
                        'day': f"{consecutive_days[0]}-{consecutive_days[-1]}",
                        'week': f"Week {week_data['week']}",
                        'issue': f"Worked {consecutive} consecutive days",
                        'solution': f"Add a day off during this period or reduce shift assignments"
                    })
        
        return violations
    
    def _check_minimum_days_off(self, schedule, min_days_off=2):
        violations = []
        
        for week_data in schedule:
            staff_worked_days = {}
            
            for shift in week_data['shifts']:
                staff = shift['staff_name']
                day = shift['day']
                if staff not in staff_worked_days:
                    staff_worked_days[staff] = set()
                staff_worked_days[staff].add(day)
            
            for staff in self.staff:
                worked_days = staff_worked_days.get(staff['name'], set())
                days_off = 7 - len(worked_days)
                
                if days_off < min_days_off:
                    violations.append({
                        'staff': staff['name'],
                        'day': 'Full week',
                        'week': f"Week {week_data['week']}",
                        'issue': f"Only {days_off} day(s) off this week",
                        'solution': f"Remove {min_days_off - days_off} shift(s) or reduce contracted hours"
                    })
        
        return violations
    
    def _format_schedule(self, results):
        schedule = []
        
        for week_num, result in enumerate(results, 1):
            week_shifts = []
            solution = result['solution']
            
            for shift_idx, shift in enumerate(self.shifts):
                for staff_idx, staff in enumerate(self.staff):
                    if solution[shift_idx][staff_idx] == 1:
                        week_shifts.append({
                            'week': week_num,
                            'day': shift['day'],
                            'shift_name': shift.get('name', f"Shift {shift_idx + 1}"),
                            'start_time': shift['start_time'],
                            'end_time': shift['end_time'],
                            'staff_id': staff['id'],
                            'staff_name': staff['name'],
                        })
            
            schedule.append({
                'week': week_num,
                'shifts': week_shifts
            })
        
        return schedule
    
    def _check_contract_hours(self, schedule):
        self.contract_issues = []
        staff_total_hours = {}
        
        for week_data in schedule:
            for shift in week_data['shifts']:
                staff_name = shift['staff_name']
                hours = self._get_shift_duration_hours(shift['start_time'], shift['end_time'])
                if staff_name not in staff_total_hours:
                    staff_total_hours[staff_name] = []
                while len(staff_total_hours[staff_name]) < week_data['week']:
                    staff_total_hours[staff_name].append(0)
                staff_total_hours[staff_name][week_data['week'] - 1] += hours
        
        for staff in self.staff:
            contracted = staff.get('contracted_hours', 0)
            max_hours = staff.get('max_hours', contracted) or contracted
            if contracted == 0:
                continue
            
            weekly_hours = staff_total_hours.get(staff['name'], [0] * self.weeks)
            avg_actual = sum(weekly_hours) / len(weekly_hours) if weekly_hours else 0
            
            if avg_actual < contracted - 0.5:
                reason = self._diagnose_contract_mismatch(staff, avg_actual, contracted)
                
                self.contract_issues.append({
                    'staff_name': staff['name'],
                    'contracted': contracted,
                    'max_hours': max_hours,
                    'actual': avg_actual,
                    'difference': contracted - avg_actual,
                    'reason': reason
                })
    
    def _diagnose_contract_mismatch(self, staff, actual, contracted):
        shift_durations = set()
        for shift in self.shifts:
            duration = self._get_shift_duration_hours(shift['start_time'], shift['end_time'])
            shift_durations.add(duration)
        
        sorted_durations = sorted(shift_durations)
        can_build = self._can_build_hours(contracted, sorted_durations, max_shifts=7)
        
        if not can_build:
            durations_list = [f"{int(d) if d == int(d) else d}h" for d in sorted_durations]
            return f"shift lengths are {', '.join(durations_list)} which can't combine to exactly {int(contracted)}h"
        
        availability = staff.get('availability', {})
        available_days = []
        for day, avail in availability.items():
            if isinstance(avail, dict):
                if avail.get('AM', False) or avail.get('PM', False):
                    available_days.append(day)
            elif avail:
                available_days.append(day)
        
        if len(available_days) < 4:
            return f"only available {len(available_days)} days per week"
        
        return f"closest match with current rules and availability"
    
    def _can_build_hours(self, target, durations, max_shifts=7, tolerance=0.5):
        possible = {0}
        for _ in range(max_shifts):
            new_possible = set(possible)
            for hours in possible:
                for duration in durations:
                    new_hours = hours + duration
                    if new_hours <= target + tolerance:
                        new_possible.add(new_hours)
            possible = new_possible
            for hours in possible:
                if abs(hours - target) <= tolerance:
                    return True
        return False
    
    def _get_shift_duration(self, shift):
        start = self._parse_time(shift['start_time'])
        end = self._parse_time(shift['end_time'])
        if end <= start:
            end += 1440
        return end - start
    
    def _get_shift_duration_hours(self, start_time, end_time):
        start = self._parse_time(start_time)
        end = self._parse_time(end_time)
        if end <= start:
            end += 1440
        return (end - start) / 60
    
    def _parse_time(self, time_str):
        hours, minutes = map(int, time_str.split(':'))
        return hours * 60 + minutes
    
    def _shifts_overlap(self, shift1, shift2):
        start1 = self._parse_time(shift1['start_time'])
        end1 = self._parse_time(shift1['end_time'])
        start2 = self._parse_time(shift2['start_time'])
        end2 = self._parse_time(shift2['end_time'])
        
        if end1 <= start1:
            end1 += 1440
        if end2 <= start2:
            end2 += 1440
        
        return not (end1 <= start2 or end2 <= start1)
    
    def _is_closing_shift(self, shift):
        end = self._parse_time(shift['end_time'])
        if end < 12 * 60:
            end += 1440
        return end >= 22 * 60
    
    def _is_opening_shift(self, shift):
        return self._parse_time(shift['start_time']) <= 8 * 60
    
    def _rule_enabled(self, rule_name):
        for rule in self.rules:
            if rule.get('type') == rule_name or rule.get('name') == rule_name:
                return rule.get('enabled', True)
        return False
    
    def _get_rule_value(self, rule_name, default):
        for rule in self.rules:
            if rule.get('type') == rule_name or rule.get('name') == rule_name:
                return rule.get('value', default)
        return default


def main():
    try:
        input_data = json.loads(sys.stdin.read())
        scheduler = ShiftlyScheduler(input_data)
        result = scheduler.solve(timeout_seconds=60)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({'success': False, 'error': str(e)}))
        sys.exit(1)


if __name__ == '__main__':
    main()